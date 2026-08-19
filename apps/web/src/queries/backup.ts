/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  backupExportUrl,
  beginBackupRestore,
  commitBackupRestore,
  getBackupPreview,
  getBackupRestoreJob,
  uploadBackupChunk,
} from '@repo/sdk/backup.ts';
import { readBackupManifest, type BackupManifestPreview } from '@/utils/backupManifest';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POLL_INTERVAL_MS = 1000;
const MIN_CHUNK_BYTES = 256 * 1024;

export const backupPreviewQueryOptions = {
  queryKey: ['backup', 'preview'] as const,
  queryFn: async () => {
    const { data, error } = await getBackupPreview();
    if (error || !data) throw new Error(error?.message ?? 'Could not read this workspace.');
    return data;
  },
};

export const useBackupPreview = () => useQuery(backupPreviewQueryOptions);

export const downloadBackup = () => {
  window.location.assign(backupExportUrl());
};

const purgeLocalWorkspace = async () => {
  try {
    const databases = (await indexedDB.databases?.()) ?? [];
    await Promise.all(
      databases
        .map((entry) => entry.name)
        .filter((name): name is string => Boolean(name) && UUID_PATTERN.test(name!))
        .map(
          (name) =>
            new Promise<void>((resolve) => {
              const request = indexedDB.deleteDatabase(name);
              request.onsuccess = () => resolve();
              request.onerror = () => resolve();
              request.onblocked = () => resolve();
            }),
        ),
    );
  } catch {
    // A browser that cannot enumerate databases still gets the reload below.
  }

  localStorage.removeItem('Wordy');
};

export type RestoreProgress = {
  phase: 'reading' | 'uploading' | 'restoring';
  ratio: number;
};

export const useRestoreBackup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (progress: RestoreProgress) => void;
    }) => {
      onProgress?.({ phase: 'reading', ratio: 0 });
      const manifest = await readBackupManifest(file);

      const { data: ticket, error: beginError } = await beginBackupRestore();
      if (beginError || !ticket) {
        throw new Error(beginError?.message ?? 'Could not start the restore.');
      }

      let chunkBytes = ticket.chunkBytes;
      let offset = 0;
      let index = 0;

      while (offset < file.size) {
        const slice = file.slice(offset, offset + chunkBytes);

        try {
          await uploadBackupChunk(ticket.uploadId, index, slice);
        } catch (error) {
          const status = (error as { response?: { status?: number } }).response?.status;
          if (status === 413 && chunkBytes > MIN_CHUNK_BYTES) {
            chunkBytes = Math.max(MIN_CHUNK_BYTES, Math.floor(chunkBytes / 2));
            continue;
          }
          throw error;
        }

        offset += slice.size;
        index += 1;
        onProgress?.({ phase: 'uploading', ratio: offset / file.size });
      }

      const { data: commit, error: commitError } = await commitBackupRestore(ticket.uploadId);
      if (commitError || !commit) {
        throw new Error(commitError?.message ?? 'Could not start the restore.');
      }

      onProgress?.({ phase: 'restoring', ratio: 1 });

      for (;;) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        const { data: job } = await getBackupRestoreJob(commit.jobId);

        if (!job) continue;
        if (job.state === 'failed') throw new Error(job.error ?? 'The restore failed.');
        if (job.state === 'done') return { job, manifest };
      }
    },
    onSuccess: async () => {
      await purgeLocalWorkspace();
      queryClient.clear();
      window.location.assign('/');
    },
  });
};

export type { BackupManifestPreview };
