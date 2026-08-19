/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import path from 'node:path';

const megabytes = (value: number) => value * 1024 * 1024;

const readByteLimit = (name: string, fallback: number) => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

export {
  BACKUP_CONTENT_FORMAT,
  BACKUP_FORMAT_VERSION,
  BACKUP_MODE,
  BACKUP_SCOPE,
  BACKUP_TABLES,
} from '../../schemas/backup.js';
export type { BackupTable } from '../../schemas/backup.js';

export const MAX_RESTORE_BYTES = readByteLimit('BACKUP_MAX_RESTORE_BYTES', megabytes(2048));
export const MAX_BACKUP_BYTES = readByteLimit('BACKUP_MAX_BACKUP_BYTES', MAX_RESTORE_BYTES);
export const MAX_ENTRY_BYTES = readByteLimit('BACKUP_MAX_ENTRY_BYTES', megabytes(100));
export const MAX_ENTRIES = readByteLimit('BACKUP_MAX_ENTRIES', 50_000);
export const MAX_MANIFEST_BYTES = readByteLimit('BACKUP_MAX_MANIFEST_BYTES', 64 * 1024);
export const CHUNK_BYTES = readByteLimit('BACKUP_CHUNK_BYTES', megabytes(8));

export const MAX_RATIO = 200;
export const RATIO_EXEMPT_BELOW_BYTES = megabytes(1);

export const FREE_SPACE_FACTOR = 1.2;
export const FREE_SPACE_FLOOR_BYTES = megabytes(256);
export const FREE_SPACE_CHECK_INTERVAL_BYTES = megabytes(32);

export const STAGING_ROOT = path.join(process.cwd(), 'restore-staging');
export const UPLOAD_ROOT = path.join(STAGING_ROOT, 'uploads');

export const MANIFEST_ENTRY = 'manifest.json';
export const COMMIT_MARKER = 'committed.json';

export const ENTRY_PREFIXES = ['db/', 'revisions/', 'attachments/', 'images/', 'covers/'] as const;

const STORED_EXTENSIONS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.avif',
  '.mp4',
  '.mov',
  '.mp3',
  '.zip',
  '.gz',
  '.7z',
  '.rar',
]);

export const shouldStoreUncompressed = (filename: string) =>
  STORED_EXTENSIONS.has(path.extname(filename).toLowerCase());
