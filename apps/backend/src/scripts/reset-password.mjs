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
  node reset-password.mjs <email>
  node reset-password.mjs --list
  printf '%s' 'a long passphrase' | node reset-password.mjs --password-stdin

This instance holds a single account, so the email may be omitted. Without
--password-stdin a strong password is generated and printed once. Passwords are
never taken as an argument, because arguments are visible to ps and land in
shell history.
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

const KNOWN_FLAGS = new Set(['--help', '-h', '--list', '--password-stdin']);

const unknown = args.filter((value) => value.startsWith('-') && !KNOWN_FLAGS.has(value));

if (unknown.length > 0 && !unknown.includes('--password')) {
  console.error(`\n  Unrecognised option: ${unknown.join(', ')}\n`);
  usage();
  process.exit(1);
}

if (args.includes('--password')) {
  console.error(
    "\n  --password is not accepted: an argument is visible to ps and stored in shell history.\n  Pipe it instead:  printf '%s' 'your passphrase' | node reset-password.mjs --password-stdin\n",
  );
  process.exit(1);
}

const readStdin = async () => {
  if (process.stdin.isTTY) {
    console.error(
      "\n  --password-stdin expects the password on stdin, but nothing is piped in.\n  Try:  printf '%s' 'your passphrase' | node reset-password.mjs --password-stdin\n",
    );
    process.exit(1);
  }

  let value = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) value += chunk;
  return value.replace(/\r?\n$/, '');
};

const provided = args.includes('--password-stdin') ? await readStdin() : null;

if (provided !== null && provided.length === 0) {
  console.error('\n  Nothing arrived on stdin, so no password was set.\n');
  process.exit(1);
}

if (provided !== null && provided.length < MIN_PASSWORD_LENGTH) {
  console.error(`\n  That password is shorter than ${MIN_PASSWORD_LENGTH} characters.\n`);
  process.exit(1);
}

const email = args.find((value) => !value.startsWith('--'));

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

const password = provided ?? randomBytes(GENERATED_PASSWORD_BYTES).toString('base64url');

const auth = betterAuth({
  baseURL: 'http://localhost',
  emailAndPassword: { enabled: true },
});
const context = await auth.$context;
const hash = await context.password.hash(password);
const now = Date.now();

const transaction = await client.transaction('write');
let added = false;
let signedOut = 0;

try {
  const accounts = await transaction.execute({
    sql: 'select id from accounts where user_id = ? and provider_id = ?',
    args: [user.id, 'credential'],
  });

  if (accounts.rows.length > 1) {
    throw new Error(
      `That account has ${accounts.rows.length} password sign-ins, so there is no single one to change. Remove the duplicates before resetting.`,
    );
  }

  if (accounts.rows.length === 0) {
    await transaction.execute({
      sql: 'insert into accounts (id, account_id, provider_id, user_id, password, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)',
      args: [crypto.randomUUID(), user.id, 'credential', user.id, hash, now, now],
    });
    added = true;
  } else {
    await transaction.execute({
      sql: 'update accounts set password = ?, updated_at = ? where id = ?',
      args: [hash, now, accounts.rows[0].id],
    });
  }

  const sessions = await transaction.execute({
    sql: 'delete from sessions where user_id = ?',
    args: [user.id],
  });
  signedOut = sessions.rowsAffected;

  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  console.error(`\n  Nothing was changed. ${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
}

if (added) console.log('\n  That account had no password sign-in; one has been added.');
console.log(`\n  Password updated for ${user.email}.`);
if (provided === null) console.log(`\n    New password:  ${password}\n`);
console.log(`  ${signedOut} existing session(s) signed out.\n`);
process.exit(0);
