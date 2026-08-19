/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import z from 'zod';

export const BACKUP_FORMAT_VERSION = 1;
export const BACKUP_CONTENT_FORMAT = { lexical: 1 } as const;
export const BACKUP_SCOPE = 'user';
export const BACKUP_MODE = 'replace';

export const BACKUP_TABLES = [
  'documents',
  'revisions',
  'favorites',
  'document_views',
  'editor_settings',
  'user_images',
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];

const countsShape = Object.fromEntries(
  BACKUP_TABLES.map((table) => [table, z.number().int().nonnegative()]),
) as Record<BackupTable, z.ZodNumber>;

export const manifestSchema = z.object({
  formatVersion: z.number().int().positive(),
  contentFormat: z.object({ lexical: z.number().int().positive() }),
  appVersion: z.string().min(1),
  schemaVersion: z.string().min(1),
  scope: z.literal(BACKUP_SCOPE),
  mode: z.literal(BACKUP_MODE),
  createdAt: z.iso.datetime(),
  counts: z.object(countsShape).partial(),
  documentTypes: z
    .object({
      space: z.number().int().nonnegative(),
      folder: z.number().int().nonnegative(),
      note: z.number().int().nonnegative(),
    })
    .optional(),
  inventory: z.object({
    revisions: z.array(z.string()),
    attachments: z.record(z.string(), z.array(z.string())),
    images: z.array(z.string()),
    covers: z.array(z.string()),
  }),
  missing: z.array(z.string()),
  bytes: z.object({ uncompressed: z.number().int().nonnegative() }),
});

export type BackupManifest = z.output<typeof manifestSchema>;
export type BackupCounts = BackupManifest['counts'];
export type BackupDocumentTypes = { space: number; folder: number; note: number };

export type BackupPreview = Pick<
  BackupManifest,
  'counts' | 'documentTypes' | 'missing' | 'bytes' | 'createdAt'
>;

export type BackupUploadTicket = {
  uploadId: string;
  chunkBytes: number;
};

export type BackupUploadProgress = {
  nextIndex: number;
  bytes: number;
};

export type BackupRestoreJob = {
  jobId: string;
  state: 'running' | 'done' | 'failed';
  documents: number;
  revisions: number;
  error: string | null;
};
