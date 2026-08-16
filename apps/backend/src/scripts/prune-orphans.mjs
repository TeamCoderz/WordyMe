/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Removes revision content files and attachment directories left behind by
 * document deletions from before those deletions cleaned up after themselves.
 *
 * Reports what it would remove and exits. Pass --delete to actually remove.
 * Deliberately not run at startup: pointed at the wrong DB_FILE_NAME it would
 * find every file unreferenced and wipe the storage directory.
 */

import 'dotenv/config';
import { createClient } from '@libsql/client';
import { readdir, rm, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const STORAGE_DIR = resolve(process.cwd(), 'storage');
const APPLY = process.argv.includes('--delete');

/**
 * Content files are written before the row that references them commits, so a
 * file that is merely new is not evidence of an orphan. Ignoring anything
 * touched recently keeps a live create from being swept when this runs against
 * a serving instance.
 */
const MIN_AGE_MS = 60 * 60 * 1000;
const CUTOFF = Date.now() - MIN_AGE_MS;

const DB_URL = process.env.DB_FILE_NAME ?? 'file:storage/local.db';

const listDir = async (path) => readdir(path, { withFileTypes: true }).catch(() => []);

const newestMtime = async (path) => {
  const entry = await stat(path).catch(() => null);
  if (!entry) return 0;
  if (entry.isFile()) return entry.mtimeMs;
  const children = await listDir(path);
  const times = await Promise.all(children.map((child) => newestMtime(join(path, child.name))));
  return Math.max(entry.mtimeMs, ...times, 0);
};

const settledLongEnough = async (path) => (await newestMtime(path)) < CUTOFF;

const sizeOf = async (path) => {
  const entry = await stat(path).catch(() => null);
  if (!entry) return 0;
  if (entry.isFile()) return entry.size;
  const children = await listDir(path);
  const sizes = await Promise.all(children.map((child) => sizeOf(join(path, child.name))));
  return sizes.reduce((total, size) => total + size, 0);
};

const refuse = (reason) => {
  console.error(`\n  ✖  Refusing to scan ${STORAGE_DIR}.\n`);
  console.error(`     ${reason}`);
  console.error(`     DB_FILE_NAME  ${DB_URL}`);
  console.error(
    `\n     Without the right database every file here looks unreferenced, so\n     removing them would delete live data. Point DB_FILE_NAME at the database\n     this storage directory belongs to and run again.\n`,
  );
  process.exit(1);
};

let client;

try {
  client = createClient({ url: DB_URL });
} catch (error) {
  refuse(`It could not be opened: ${error.message}`);
}

const tables = new Set(
  (
    await client
      .execute("select name from sqlite_master where type = 'table'")
      .catch(() => ({ rows: [] }))
  ).rows.map((row) => String(row.name)),
);

if (!tables.has('revisions') || !tables.has('documents')) {
  refuse('It has no documents/revisions tables, so it is empty or not a WordyMe database.');
}

const [{ n: userCount }] = (await client.execute('select count(*) as n from users')).rows;

if (Number(userCount) === 0) {
  refuse('It has no user accounts, so it has never been initialised.');
}

const knownRevisions = new Set(
  (await client.execute('select id from revisions')).rows.map((row) => String(row.id)),
);
const knownDocuments = new Set(
  (await client.execute('select id from documents')).rows.map((row) => String(row.id)),
);

const orphans = [];
let skippedRecent = 0;

for (const entry of await listDir(join(STORAGE_DIR, 'revisions'))) {
  if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
  if (knownRevisions.has(entry.name.replace(/\.json$/, ''))) continue;
  const path = join(STORAGE_DIR, 'revisions', entry.name);
  if (!(await settledLongEnough(path))) {
    skippedRecent += 1;
    continue;
  }
  orphans.push(path);
}

for (const entry of await listDir(join(STORAGE_DIR, 'attachments'))) {
  if (!entry.isDirectory() || knownDocuments.has(entry.name)) continue;
  const path = join(STORAGE_DIR, 'attachments', entry.name);
  if (!(await settledLongEnough(path))) {
    skippedRecent += 1;
    continue;
  }
  orphans.push(path);
}

if (skippedRecent > 0) {
  console.log(
    `Skipped ${skippedRecent} unreferenced ${skippedRecent === 1 ? 'entry' : 'entries'} modified in the last hour, in case they belong to an in-flight write.`,
  );
}

if (orphans.length === 0) {
  console.log(`No orphans found under ${STORAGE_DIR}.`);
  process.exit(0);
}

const sizes = await Promise.all(orphans.map(sizeOf));
const totalMb = (sizes.reduce((total, size) => total + size, 0) / 1024 / 1024).toFixed(2);

console.log(
  `${orphans.length} orphaned ${orphans.length === 1 ? 'entry' : 'entries'} (${totalMb} MB) under ${STORAGE_DIR}:`,
);
for (const path of orphans.slice(0, 20)) console.log(`  ${path.replace(STORAGE_DIR, 'storage')}`);
if (orphans.length > 20) console.log(`  … and ${orphans.length - 20} more`);

if (!APPLY) {
  console.log('\nNothing removed. Re-run with --delete to remove them.');
  process.exit(0);
}

await Promise.all(orphans.map((path) => rm(path, { recursive: true, force: true })));
console.log(`\nRemoved ${orphans.length} entries (${totalMb} MB).`);
