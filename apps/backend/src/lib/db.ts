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
      const delay = Math.ceil(
        Math.random() * Math.min(BUSY_BASE_DELAY_MS * 2 ** attempt, BUSY_MAX_DELAY_MS),
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};
