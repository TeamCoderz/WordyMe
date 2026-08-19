/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Button } from '@repo/ui/components/button';
import { Download } from '@repo/ui/components/icons';
import { downloadBackup, useBackupPreview } from '@/queries/backup';
import { formatBytes, plural } from '@/utils/backupManifest';
import { RestoreBackupForm } from './RestoreBackupForm';

const NO_TYPES = { space: 0, folder: 0, note: 0 };

export function BackupExportSection() {
  const preview = useBackupPreview();
  const types = preview.data?.documentTypes ?? NO_TYPES;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Create a backup</h2>
        <p className="text-sm text-muted-foreground">
          Saves every space, document, revision and attachment as a single file. Your email and
          password are never included.
        </p>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        {preview.isLoading ? (
          <p className="text-sm text-muted-foreground">Measuring your workspace…</p>
        ) : preview.data ? (
          <dl className="grid grid-cols-2 @md:grid-cols-5 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Spaces</dt>
              <dd className="font-medium">{types.space}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Documents</dt>
              <dd className="font-medium">{types.note + types.folder}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Revisions</dt>
              <dd className="font-medium">{preview.data.counts.revisions}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Favourites</dt>
              <dd className="font-medium">{preview.data.counts.favorites}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Estimated size</dt>
              <dd className="font-medium">{formatBytes(preview.data.bytes.uncompressed)}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-destructive">Could not measure this workspace.</p>
        )}

        {preview.data && preview.data.missing.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {plural(preview.data.missing.length, 'file')} already missing from storage will be
            recorded in the backup as missing.
          </p>
        )}

        <Button onClick={downloadBackup} disabled={!preview.data}>
          <Download className="h-4 w-4" />
          Download backup
        </Button>
      </div>
    </section>
  );
}

export function BackupRestoreSection() {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Restore from a backup</h2>
        <p className="text-sm text-muted-foreground">
          Replaces this workspace with the contents of a WordyMe backup file.
        </p>
      </div>

      <div className="rounded-lg border border-destructive/40 p-4">
        <RestoreBackupForm />
      </div>
    </section>
  );
}
