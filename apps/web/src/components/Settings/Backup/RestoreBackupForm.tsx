/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useState } from 'react';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { DialogClose } from '@repo/ui/components/dialog';
import {
  CloudUpload,
  FileArchive,
  Info,
  Package,
  TriangleAlert,
  Upload,
} from '@repo/ui/components/icons';
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@repo/ui/components/dropzone';
import { toast } from 'sonner';
import { useBackupPreview, useRestoreBackup, type RestoreProgress } from '@/queries/backup';
import {
  formatBytes,
  plural,
  readBackupManifest,
  type BackupManifestPreview,
} from '@/utils/backupManifest';

export const RestoreBackupForm = ({ inDialog = false }: { inDialog?: boolean }) => {
  const preview = useBackupPreview();
  const restore = useRestoreBackup();

  const [file, setFile] = useState<File | null>(null);
  const [manifest, setManifest] = useState<BackupManifestPreview | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [progress, setProgress] = useState<RestoreProgress | null>(null);

  const pickFile = async (picked: File | null) => {
    setFile(null);
    setManifest(null);
    setConfirmation('');
    if (!picked) return;

    try {
      const read = await readBackupManifest(picked);
      setFile(picked);
      setManifest(read);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const startRestore = () => {
    if (!file) return;

    restore.mutate(
      { file, onProgress: setProgress },
      {
        onError: (error) => {
          setProgress(null);
          toast.error((error as Error).message);
        },
      },
    );
  };

  const busy = restore.isPending;
  const types = preview.data?.documentTypes ?? { space: 0, folder: 0, note: 0 };
  const currentDocuments = types.note + types.folder;
  const currentSpaces = types.space;
  const isEmptyWorkspace = preview.data ? currentDocuments === 0 && currentSpaces <= 1 : false;
  const confirmWord = isEmptyWorkspace ? 'restore' : 'replace';
  const canRestore = Boolean(file) && confirmation.trim().toLowerCase() === confirmWord && !busy;

  return (
    <div className="space-y-4">
      {isEmptyWorkspace ? (
        <div className="flex gap-3 rounded-md bg-muted/60 p-3 text-sm">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-muted-foreground">
            This workspace has no documents yet. Its current space and editor settings are replaced
            by the backup, and the app reloads once your documents are back.
          </p>
        </div>
      ) : (
        <div className="flex gap-3 rounded-md bg-destructive/10 p-3 text-sm">
          <TriangleAlert className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
          <div className="space-y-1">
            <p className="font-medium text-destructive">This cannot be undone.</p>
            <p className="text-muted-foreground">
              Everything you have now ({plural(currentSpaces, 'space')} and{' '}
              {plural(currentDocuments, 'document')}) is deleted and replaced. The app reloads when
              the restore finishes.
            </p>
          </div>
        </div>
      )}

      <Dropzone
        accept={{ 'application/zip': ['.zip'] }}
        maxFiles={1}
        disabled={busy}
        src={file ? [file] : undefined}
        onDrop={(accepted) => void pickFile(accepted[0] ?? null)}
        onError={(error) => toast.error(error.message)}
        className="p-6"
      >
        <DropzoneEmptyState>
          <div className="flex flex-col items-center gap-1 text-center">
            <CloudUpload className="h-7 w-7 text-muted-foreground" />
            <p className="text-sm font-medium">Choose a backup file</p>
            <p className="text-xs text-muted-foreground">or drag it here — a WordyMe .zip backup</p>
          </div>
        </DropzoneEmptyState>
        <DropzoneContent>
          <div className="flex w-full flex-col items-center gap-1 text-center">
            <FileArchive className="h-7 w-7" />
            <p className="w-full truncate text-sm font-medium">{file?.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(file?.size ?? 0)} · click to choose a different file
            </p>
          </div>
        </DropzoneContent>
      </Dropzone>

      {manifest && (
        <div className="rounded-md border p-3 text-sm space-y-1">
          <p className="flex items-center gap-2 font-medium">
            <Package className="h-4 w-4" />
            Backup contents
          </p>
          <p className="text-muted-foreground">
            {manifest.documentTypes
              ? `${plural(manifest.documentTypes.space, 'space')}, ${plural(
                  manifest.documentTypes.note + manifest.documentTypes.folder,
                  'document',
                )}`
              : plural(manifest.counts.documents ?? 0, 'document')}
            , {plural(manifest.counts.revisions ?? 0, 'revision')}, taken{' '}
            {new Date(manifest.createdAt).toLocaleString()} (
            {formatBytes(manifest.bytes.uncompressed)}).
          </p>
          {manifest.missing.length > 0 && (
            <p className="text-muted-foreground">
              {plural(manifest.missing.length, 'file')} were already missing when this backup was
              made.
            </p>
          )}
        </div>
      )}

      {manifest && (
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground" htmlFor="backup-confirm">
            Type <span className="font-mono font-medium">{confirmWord}</span> to confirm.
          </label>
          <Input
            id="backup-confirm"
            value={confirmation}
            disabled={busy}
            autoComplete="off"
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </div>
      )}

      {progress && (
        <div className="space-y-1" role="status" aria-live="polite">
          <p className="text-sm text-muted-foreground">
            {progress.phase === 'reading' && 'Reading the backup…'}
            {progress.phase === 'uploading' && `Uploading… ${Math.round(progress.ratio * 100)}%`}
            {progress.phase === 'restoring' && `${progress.detail ?? 'Restoring your workspace'}…`}
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground transition-all"
              style={{ width: `${Math.max(4, Math.round(progress.ratio * 100))}%` }}
            />
          </div>
        </div>
      )}

      <div className={inDialog ? 'flex justify-end gap-2 pt-2' : 'flex'}>
        {inDialog && (
          <DialogClose asChild>
            <Button variant="outline" disabled={busy}>
              Cancel
            </Button>
          </DialogClose>
        )}
        <Button
          variant={isEmptyWorkspace ? 'default' : 'destructive'}
          disabled={!canRestore}
          onClick={startRestore}
        >
          <Upload className="h-4 w-4" />
          {busy ? 'Restoring…' : isEmptyWorkspace ? 'Restore my workspace' : 'Replace my workspace'}
        </Button>
      </div>
    </div>
  );
};
