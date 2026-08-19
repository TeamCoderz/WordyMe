/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  BACKUP_CONTENT_FORMAT,
  BACKUP_FORMAT_VERSION,
  manifestSchema,
  type BackupManifest,
} from '../../schemas/backup.js';

export type { BackupManifest };

const schemaOrdinal = (tag: string) => {
  const match = /^(\d+)/.exec(tag);
  return match ? Number(match[1]) : null;
};

type ManifestRejection = { code: 'unsupported' | 'malformed'; message: string };

export const validateManifest = (
  raw: unknown,
  targetSchemaVersion: string,
): { ok: true; manifest: BackupManifest } | { ok: false; rejection: ManifestRejection } => {
  const parsed = manifestSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      rejection: { code: 'malformed', message: 'The manifest is missing or malformed.' },
    };
  }

  const manifest = parsed.data;

  if (manifest.formatVersion > BACKUP_FORMAT_VERSION) {
    return {
      ok: false,
      rejection: {
        code: 'unsupported',
        message: `This backup was made by a newer WordyMe (format ${manifest.formatVersion}); this build supports up to ${BACKUP_FORMAT_VERSION}.`,
      },
    };
  }

  if (manifest.contentFormat.lexical > BACKUP_CONTENT_FORMAT.lexical) {
    return {
      ok: false,
      rejection: {
        code: 'unsupported',
        message: `This backup stores editor content in a newer format (${manifest.contentFormat.lexical}); this build supports up to ${BACKUP_CONTENT_FORMAT.lexical}. Restoring it would produce documents this version cannot open.`,
      },
    };
  }

  const backupSchema = schemaOrdinal(manifest.schemaVersion);
  const targetSchema = schemaOrdinal(targetSchemaVersion);

  if (backupSchema !== null && targetSchema !== null && backupSchema > targetSchema) {
    return {
      ok: false,
      rejection: {
        code: 'unsupported',
        message: `This backup came from a newer database layout (${manifest.schemaVersion}); this build is at ${targetSchemaVersion}. Update WordyMe before restoring it.`,
      },
    };
  }

  return { ok: true, manifest };
};
