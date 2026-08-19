/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Sets a new password for an account from the command line, for self-hosters
 * who have locked themselves out. There is no email transport in this app, so
 * the built-in reset flow cannot be used.
 *
 * Hashes through Better Auth itself, so the result is exactly what a normal
 * sign-in verifies against. Existing sessions are revoked, because a password
 * reset that leaves old sessions alive is not a reset.
 */

import 'dotenv/config';
import { createClient } from '@libsql/client';
import { betterAuth } from 'better-auth';
import { randomBytes } from 'node:crypto';

const GENERATED_PASSWORD_BYTES = 12;
const MIN_PASSWORD_LENGTH = 8;

const DB_URL = process.env.DB_FILE_NAME ?? 'file:storage/local.db';

const usage = () => {
  console.log(`
Set a new password for an account.

  node reset-password.mjs
  node reset-password.mjs --password '<new password>'
  node reset-password.mjs <email>
  node reset-password.mjs --list

This instance holds a single account, so the email may be omitted. Without
--password a strong one is generated and printed once.
`);
};

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  usage();
  process.exit(0);
}

const client = createClient({ url: DB_URL });

const tableExists = async (name) => {
  const result = await client.execute({
    sql: "select name from sqlite_master where type='table' and name=?",
    args: [name],
  });
  return result.rows.length > 0;
};

if (!(await tableExists('users')) || !(await tableExists('accounts'))) {
  console.error(
    `\n  No WordyMe database at ${DB_URL}.\n\n  Point DB_FILE_NAME at the database this instance uses and run again.\n`,
  );
  process.exit(1);
}

if (args.includes('--list')) {
  const users = await client.execute(
    'select u.email, u.name, (select count(*) from accounts a where a.user_id = u.id and a.provider_id = ?) as credentials from users u order by u.email',
    ['credential'],
  );

  if (users.rows.length === 0) {
    console.log('\n  No accounts exist yet. Open the app and sign up.\n');
    process.exit(0);
  }

  console.log('\n  Accounts:\n');
  for (const row of users.rows) {
    const suffix = Number(row.credentials) > 0 ? '' : '  (no password sign-in)';
    console.log(`    ${row.email}   ${row.name ?? ''}${suffix}`);
  }
  console.log('');
  process.exit(0);
}

const passwordIndex = args.indexOf('--password');
const provided = passwordIndex === -1 ? null : args[passwordIndex + 1];

if (passwordIndex !== -1 && !provided) {
  console.error('\n  --password needs a value.\n');
  process.exit(1);
}

if (provided && provided.length < MIN_PASSWORD_LENGTH) {
  console.error(`\n  That password is shorter than ${MIN_PASSWORD_LENGTH} characters.\n`);
  process.exit(1);
}

const email = args.find((value, index) => !value.startsWith('--') && index !== passwordIndex + 1);

const users = email
  ? await client.execute({
      sql: 'select id, email from users where email = ? collate nocase',
      args: [email],
    })
  : await client.execute('select id, email from users');

if (users.rows.length === 0) {
  console.error(
    email
      ? `\n  No account with the email ${email}.\n  Run with --list to see the accounts on this instance.\n`
      : '\n  This instance has no accounts yet. Open the app and sign up.\n',
  );
  process.exit(1);
}

if (!email && users.rows.length > 1) {
  console.error('\n  This instance has more than one account. Name the one to reset:\n');
  for (const row of users.rows) console.error(`    ${row.email}`);
  console.error('');
  process.exit(1);
}

const user = users.rows[0];

const accounts = await client.execute({
  sql: 'select id from accounts where user_id = ? and provider_id = ?',
  args: [user.id, 'credential'],
});

const password = provided ?? randomBytes(GENERATED_PASSWORD_BYTES).toString('base64url');

const auth = betterAuth({
  baseURL: 'http://localhost',
  emailAndPassword: { enabled: true },
});
const context = await auth.$context;
const hash = await context.password.hash(password);
const now = Date.now();

if (accounts.rows.length === 0) {
  await client.execute({
    sql: 'insert into accounts (id, account_id, provider_id, user_id, password, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)',
    args: [crypto.randomUUID(), user.id, 'credential', user.id, hash, now, now],
  });
  console.log('\n  That account had no password sign-in; one has been added.');
} else {
  await client.execute({
    sql: 'update accounts set password = ?, updated_at = ? where id = ?',
    args: [hash, now, accounts.rows[0].id],
  });
}

const sessions = await client.execute({
  sql: 'delete from sessions where user_id = ?',
  args: [user.id],
});

console.log(`\n  Password updated for ${user.email}.`);
if (!provided) console.log(`\n    New password:  ${password}\n`);
console.log(`  ${sessions.rowsAffected} existing session(s) signed out.\n`);
process.exit(0);
