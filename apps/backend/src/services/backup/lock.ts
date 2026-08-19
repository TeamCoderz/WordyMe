/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { HttpConflict } from '@httpx/exception';

const STALL_TIMEOUT_MS = 10 * 60_000;

type BackupJobKind = 'export' | 'restore';

type ActiveJob = {
  kind: BackupJobKind;
  userId: string;
  startedAt: number;
  touchedAt: number;
};

let active: ActiveJob | null = null;

const isStalled = (job: ActiveJob) => Date.now() - job.touchedAt > STALL_TIMEOUT_MS;

export const acquireBackupJob = (kind: BackupJobKind, userId: string) => {
  if (active && !isStalled(active)) {
    throw new HttpConflict(
      `A ${active.kind} is already running. Wait for it to finish before starting another.`,
    );
  }

  if (active) {
    console.warn(
      `Releasing stalled ${active.kind} job started at ${new Date(active.startedAt).toISOString()}.`,
    );
  }

  const job: ActiveJob = { kind, userId, startedAt: Date.now(), touchedAt: Date.now() };
  active = job;

  let released = false;

  return {
    touch: () => {
      if (!released) job.touchedAt = Date.now();
    },
    release: () => {
      if (released) return;
      released = true;
      if (active === job) active = null;
    },
  };
};

export const isRestoreRunning = () =>
  Boolean(active && active.kind === 'restore' && !isStalled(active));
