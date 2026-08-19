/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type {
  BackupPreview,
  BackupRestoreJob,
  BackupUploadProgress,
  BackupUploadTicket,
} from '@repo/backend/backup.js';
import { client, get, post } from './client.js';

export const getBackupPreview = async () => {
  return await get<BackupPreview>('/backup/preview');
};

export const backupExportUrl = () => `${client.defaults.baseURL}/backup/export`;

export const beginBackupRestore = async () => {
  return await post<BackupUploadTicket>('/backup/restore/begin');
};

export const getBackupUploadStatus = async (uploadId: string) => {
  return await get<BackupUploadProgress>('/backup/restore/status', { uploadId });
};

export const uploadBackupChunk = async (uploadId: string, index: number, chunk: Blob) => {
  const response = await client.put<BackupUploadProgress>('/backup/restore/chunk', chunk, {
    params: { uploadId, index },
    headers: { 'Content-Type': 'application/octet-stream' },
  });

  return response.data;
};

export const commitBackupRestore = async (uploadId: string) => {
  return await post<{ jobId: string }>(`/backup/restore/commit?uploadId=${uploadId}`);
};

export const getBackupRestoreJob = async (jobId: string) => {
  return await get<BackupRestoreJob>('/backup/restore/job', { jobId });
};
