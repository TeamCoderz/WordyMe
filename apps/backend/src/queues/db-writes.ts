/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import PQueue from 'p-queue';

export const dbWritesQueue = new PQueue({ concurrency: 1 });

export const enqueueDbWrite = (task: () => Promise<unknown>): void => {
  void dbWritesQueue.add(task).catch((error) => {
    console.error('Queued database write failed:', error);
  });
};
