/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { drizzle } from 'drizzle-orm/libsql';
import { sql } from 'drizzle-orm';
import { env } from '../env.js';
import * as schema from '../models/index.js';

export const db = drizzle(env.DB_FILE_NAME, { schema });

export const configureDatabase = async () => {
  await db.run(sql`PRAGMA journal_mode = WAL`);
  await db.run(sql`PRAGMA synchronous = NORMAL`);
};

const CHECKPOINT_ATTEMPTS = 5;
const CHECKPOINT_RETRY_DELAY_MS = 100;

export const checkpointDatabase = async () => {
  for (let attempt = 1; attempt <= CHECKPOINT_ATTEMPTS; attempt += 1) {
    try {
      const result = await db.$client.execute('PRAGMA wal_checkpoint(TRUNCATE)');
      const busy = Number(result.rows[0]?.busy ?? 0);

      if (busy === 0) break;

      if (attempt === CHECKPOINT_ATTEMPTS) {
        console.warn(
          'WAL checkpoint still blocked by another connection; a backup needs local.db together with its -wal and -shm files to be complete.',
        );
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, CHECKPOINT_RETRY_DELAY_MS));
    } catch (error) {
      console.error('WAL checkpoint failed:', error);
      break;
    }
  }

  try {
    db.$client.close();
  } catch (error) {
    console.error('Closing the database connection failed:', error);
  }
};

const BUSY_RETRIES = 7;
const BUSY_BASE_DELAY_MS = 25;
const BUSY_MAX_DELAY_MS = 800;

const isBusy = (error: unknown) =>
  error instanceof Error && /SQLITE_BUSY|database is locked/i.test(error.message);

export const withWriteRetry = async <T>(operation: () => Promise<T>): Promise<T> => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= BUSY_RETRIES || !isBusy(error)) throw error;
      const cap = Math.min(BUSY_BASE_DELAY_MS * 2 ** attempt, BUSY_MAX_DELAY_MS);
      const delay = Math.ceil(cap / 2 + (Math.random() * cap) / 2);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};
