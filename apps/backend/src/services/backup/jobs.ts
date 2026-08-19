/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { randomUUID } from 'node:crypto';
import { HttpForbidden, HttpNotFound } from '@httpx/exception';
import type { BackupRestoreJob } from '../../schemas/backup.js';

type RestoreJob = BackupRestoreJob & { userId: string };

const jobs = new Map<string, RestoreJob>();
const JOB_TTL_MS = 60 * 60_000;

export const startRestoreJob = (
  userId: string,
  run: (jobId: string) => Promise<{ documents: number; revisions: number }>,
) => {
  const jobId = randomUUID();
  const job: RestoreJob = {
    jobId,
    userId,
    state: 'running',
    documents: 0,
    revisions: 0,
    error: null,
  };
  jobs.set(jobId, job);

  void run(jobId)
    .then((counts) => {
      job.state = 'done';
      job.documents = counts.documents;
      job.revisions = counts.revisions;
    })
    .catch((error: unknown) => {
      job.state = 'failed';
      job.error = error instanceof Error ? error.message : 'The restore failed.';
      console.error('Backup restore failed:', error);
    })
    .finally(() => {
      setTimeout(() => jobs.delete(jobId), JOB_TTL_MS).unref();
    });

  return jobId;
};

export const getRestoreJob = (jobId: string, userId: string): BackupRestoreJob => {
  const job = jobs.get(jobId);
  if (!job) throw new HttpNotFound('That restore job is no longer available.');
  if (job.userId !== userId)
    throw new HttpForbidden('That restore job belongs to another account.');

  return {
    jobId: job.jobId,
    state: job.state,
    documents: job.documents,
    revisions: job.revisions,
    error: job.error,
  };
};
