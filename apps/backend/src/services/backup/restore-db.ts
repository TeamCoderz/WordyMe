/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { createReadStream, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { sql, type SQL } from 'drizzle-orm';
import { HttpUnprocessableEntity } from '@httpx/exception';
import { db } from '../../lib/db.js';
import { BACKUP_TABLES, type BackupTable } from './constants.js';
import type { BackupManifest } from './manifest.js';

type Row = Record<string, unknown>;
type Executor = Pick<typeof db, 'run' | 'all'>;

const readNdjson = async (filePath: string): Promise<Row[]> => {
  const rows: Row[] = [];

  if (!existsSync(filePath)) return rows;

  const stream = createReadStream(filePath, { encoding: 'utf8' });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new HttpUnprocessableEntity(`Corrupt data in ${path.basename(filePath)}.`);
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new HttpUnprocessableEntity(`Corrupt data in ${path.basename(filePath)}.`);
    }

    rows.push(parsed as Row);
  }

  return rows;
};

const tableColumns = async (table: BackupTable) => {
  const rows = await db.all<{ name: string }>(sql`select name from pragma_table_info(${table})`);
  return new Set(rows.map((row) => row.name));
};

const insertRow = async (
  executor: Executor,
  table: BackupTable,
  row: Row,
  columns: Set<string>,
) => {
  const keys = Object.keys(row).filter((key) => columns.has(key));
  if (keys.length === 0) return;

  const columnList = keys.map((key) => sql.identifier(key));
  const valueList = keys.map((key) => sql`${row[key] as SQL}`);

  await executor.run(
    sql`insert into ${sql.identifier(table)} (${sql.join(columnList, sql`, `)}) values (${sql.join(valueList, sql`, `)})`,
  );
};

const assertTreeIsSound = (documents: Row[]) => {
  const byId = new Map<string, Row>();
  for (const document of documents) {
    const id = document.id;
    if (typeof id !== 'string') {
      throw new HttpUnprocessableEntity('A document in this backup has no id.');
    }
    byId.set(id, document);
  }

  for (const document of documents) {
    for (const key of ['parent_id', 'space_id'] as const) {
      const reference = document[key];
      if (reference === null || reference === undefined) continue;
      if (typeof reference !== 'string' || !byId.has(reference)) {
        throw new HttpUnprocessableEntity(
          `This backup is inconsistent: a document points at a ${key} that is not in the backup.`,
        );
      }
    }
  }

  for (const key of ['parent_id', 'space_id'] as const) {
    for (const start of byId.keys()) {
      const seen = new Set<string>([start]);
      let cursor = byId.get(start)?.[key];

      while (typeof cursor === 'string') {
        if (seen.has(cursor)) {
          throw new HttpUnprocessableEntity(
            `This backup is inconsistent: its documents form a ${key} loop.`,
          );
        }
        seen.add(cursor);
        cursor = byId.get(cursor)?.[key];
      }
    }
  }
};

export const restoreDatabase = async (
  stagingDir: string,
  userId: string,
  manifest: BackupManifest,
) => {
  const tables = {} as Record<BackupTable, Row[]>;

  for (const table of BACKUP_TABLES) {
    tables[table] = await readNdjson(path.join(stagingDir, 'db', `${table}.ndjson`));
  }

  for (const table of BACKUP_TABLES) {
    const declared = manifest.counts[table];
    if (declared !== undefined && tables[table].length !== declared) {
      throw new HttpUnprocessableEntity(
        `This backup is incomplete: ${table} declares ${declared} rows but carries ${tables[table].length}. Nothing was changed.`,
      );
    }
  }

  assertTreeIsSound(tables.documents);

  const columns = {} as Record<BackupTable, Set<string>>;
  for (const table of BACKUP_TABLES) {
    columns[table] = await tableColumns(table);
  }

  const revisionIds = new Set(tables.revisions.map((row) => String(row.id)));

  await db.transaction(async (tx) => {
    const executor = tx as unknown as Executor;

    await executor.run(sql`pragma defer_foreign_keys = on`);

    for (const table of BACKUP_TABLES) {
      if (table === 'documents' || table === 'revisions' || table === 'editor_settings') continue;
      await executor.run(sql`delete from ${sql.identifier(table)} where user_id = ${userId}`);
    }

    await executor.run(
      sql`update documents set current_revision_id = null where user_id = ${userId}`,
    );
    await executor.run(sql`delete from revisions where user_id = ${userId}`);
    await executor.run(sql`delete from documents where user_id = ${userId}`);

    const heads: [string, string][] = [];

    for (const document of tables.documents) {
      const head = document.current_revision_id;
      if (typeof head === 'string' && revisionIds.has(head)) {
        heads.push([String(document.id), head]);
      }
      await insertRow(
        executor,
        'documents',
        { ...document, user_id: userId, current_revision_id: null },
        columns.documents,
      );
    }

    for (const revision of tables.revisions) {
      await insertRow(executor, 'revisions', { ...revision, user_id: userId }, columns.revisions);
    }

    for (const [documentId, revisionId] of heads) {
      await executor.run(
        sql`update documents set current_revision_id = ${revisionId} where id = ${documentId}`,
      );
    }

    for (const favorite of tables.favorites) {
      await insertRow(executor, 'favorites', { ...favorite, user_id: userId }, columns.favorites);
    }

    for (const table of BACKUP_TABLES) {
      if (table === 'documents' || table === 'revisions' || table === 'editor_settings') continue;
      if (table === 'favorites') continue;

      for (const row of tables[table]) {
        await insertRow(executor, table, { ...row, user_id: userId }, columns[table]);
      }
    }

    const [settings] = tables.editor_settings;
    if (settings) {
      await executor.run(
        sql`update editor_settings set keep_previous_revision = ${settings.keep_previous_revision ?? 0}, autosave = ${settings.autosave ?? 0} where user_id = ${userId}`,
      );
    }

    const violations = await executor.all<Record<string, unknown>>(sql`pragma foreign_key_check`);
    if (violations.length > 0) {
      throw new HttpUnprocessableEntity(
        `Restoring this backup would leave ${violations.length} broken reference(s). Nothing was changed.`,
      );
    }
  });

  return {
    documents: tables.documents.length,
    revisions: tables.revisions.length,
  };
};
