/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { sql } from 'drizzle-orm';
import yazl from 'yazl';
import { db } from '../../lib/db.js';
import { resolvePhysicalPath } from '../../lib/storage.js';
import {
  BACKUP_CONTENT_FORMAT,
  BACKUP_FORMAT_VERSION,
  BACKUP_MODE,
  BACKUP_SCOPE,
  BACKUP_TABLES,
  BackupTable,
  MANIFEST_ENTRY,
  shouldStoreUncompressed,
} from './constants.js';
import { collectInventory, estimateUncompressedBytes } from './inventory.js';
import type { BackupManifest } from './manifest.js';

const PAGE_SIZE = 500;

export const readSchemaVersion = async () => {
  try {
    const journalPath = path.join(process.cwd(), 'drizzle', 'meta', '_journal.json');
    const journal = JSON.parse(await readFile(journalPath, 'utf8')) as {
      entries?: { tag?: string }[];
    };
    const entries = journal.entries ?? [];
    return entries[entries.length - 1]?.tag ?? 'unknown';
  } catch {
    return 'unknown';
  }
};

const countRows = async (table: BackupTable, userId: string) => {
  const rows = await db.all<{ total: number }>(
    sql`select count(*) as total from ${sql.identifier(table)} where user_id = ${userId}`,
  );
  return Number(rows[0]?.total ?? 0);
};

const countDocumentTypes = async (userId: string) => {
  const rows = await db.all<{ document_type: string; total: number }>(
    sql`select document_type, count(*) as total from documents where user_id = ${userId} group by document_type`,
  );

  const totals = { space: 0, folder: 0, note: 0 };
  for (const row of rows) {
    if (row.document_type in totals)
      totals[row.document_type as keyof typeof totals] = Number(row.total);
  }

  return totals;
};

const pageRows = async function* (table: BackupTable, userId: string) {
  let offset = 0;

  for (;;) {
    const rows = await db.all<Record<string, unknown>>(
      sql`select * from ${sql.identifier(table)} where user_id = ${userId} order by id limit ${PAGE_SIZE} offset ${offset}`,
    );

    if (rows.length === 0) return;

    for (const row of rows) yield row;

    if (rows.length < PAGE_SIZE) return;
    offset += PAGE_SIZE;
  }
};

const ndjsonStream = (table: BackupTable, userId: string) =>
  Readable.from(
    (async function* () {
      for await (const row of pageRows(table, userId)) {
        yield `${JSON.stringify(row)}\n`;
      }
    })(),
  );

export const buildManifest = async (userId: string) => {
  const { inventory, missing, fileBytes } = await collectInventory(userId);

  const counts = {} as BackupManifest['counts'];
  let rowTotal = 0;

  for (const table of BACKUP_TABLES) {
    const total = await countRows(table, userId);
    counts[table] = total;
    rowTotal += total;
  }

  const manifest: BackupManifest = {
    formatVersion: BACKUP_FORMAT_VERSION,
    contentFormat: { ...BACKUP_CONTENT_FORMAT },
    appVersion: process.env.APP_VERSION ?? 'unknown',
    schemaVersion: await readSchemaVersion(),
    scope: BACKUP_SCOPE,
    mode: BACKUP_MODE,
    createdAt: new Date().toISOString(),
    counts,
    documentTypes: await countDocumentTypes(userId),
    inventory,
    missing,
    bytes: { uncompressed: estimateUncompressedBytes(fileBytes, rowTotal) },
  };

  return manifest;
};

export const createBackupArchive = (manifest: BackupManifest, userId: string) => {
  const zip = new yazl.ZipFile();

  zip.addBuffer(Buffer.from(JSON.stringify(manifest), 'utf8'), MANIFEST_ENTRY, {
    compress: true,
  });

  for (const table of BACKUP_TABLES) {
    zip.addReadStream(ndjsonStream(table, userId), `db/${table}.ndjson`, { compress: true });
  }

  for (const revisionId of manifest.inventory.revisions) {
    const entryName = `revisions/${revisionId}.json`;
    zip.addReadStream(createReadStream(resolvePhysicalPath(entryName)), entryName, {
      compress: true,
    });
  }

  for (const [documentId, filenames] of Object.entries(manifest.inventory.attachments)) {
    for (const filename of filenames) {
      const entryName = `attachments/${documentId}/${filename}`;
      zip.addReadStream(createReadStream(resolvePhysicalPath(entryName)), entryName, {
        compress: !shouldStoreUncompressed(filename),
      });
    }
  }

  for (const bucket of ['images', 'covers'] as const) {
    for (const filename of manifest.inventory[bucket]) {
      const physicalPath = resolvePhysicalPath(`${bucket}/${userId}/${filename}`);
      zip.addReadStream(createReadStream(physicalPath), `${bucket}/${filename}`, {
        compress: !shouldStoreUncompressed(filename),
      });
    }
  }

  zip.end();
  return zip;
};

export const backupFilename = () => {
  const stamp = new Date().toISOString().slice(0, 10);
  return `wordyme-backup-${stamp}.zip`;
};
