/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { emitToUser, isSocketReady } from '../../lib/socket.js';
import { resolvePhysicalPath } from '../../lib/storage.js';
import { collectInventory } from './inventory.js';
import { readSchemaVersion } from './export.js';
import { restoreDatabase } from './restore-db.js';
import {
  discardStaging,
  publishStagedFiles,
  stageArchive,
  verifyStagedCompleteness,
  writeCommitMarker,
} from './staging.js';

const liveFilesFor = (inventory: Awaited<ReturnType<typeof collectInventory>>['inventory']) => {
  const names = new Set<string>();

  for (const revisionId of inventory.revisions) names.add(`revisions/${revisionId}.json`);
  for (const [documentId, filenames] of Object.entries(inventory.attachments)) {
    for (const filename of filenames) names.add(`attachments/${documentId}/${filename}`);
  }

  return names;
};

export const runRestore = async (
  archivePath: string,
  userId: string,
  jobId: string = randomUUID(),
  onPhase?: (
    phase: 'unpacking' | 'verifying' | 'writing' | 'publishing',
    staged: number,
    total: number,
  ) => void,
) => {
  const before = await collectInventory(userId);
  const previousFiles = liveFilesFor(before.inventory);

  const report = (
    phase: 'unpacking' | 'verifying' | 'writing' | 'publishing',
    staged = 0,
    total = 0,
  ) => {
    onPhase?.(phase, staged, total);
    if (isSocketReady()) emitToUser(userId, 'backup:progress', { jobId, phase, staged, total });
  };

  report('unpacking');
  const staged = await stageArchive(archivePath, jobId, await readSchemaVersion(), (done, total) =>
    report('unpacking', done, total),
  );

  try {
    report('verifying');
    await verifyStagedCompleteness(staged);

    report('writing');
    const counts = await restoreDatabase(staged.stagingDir, userId, staged.manifest);

    report('publishing');
    const payloadFiles = staged.stagedFiles.filter((name) => !name.startsWith('db/'));
    await writeCommitMarker(staged.stagingDir, payloadFiles);
    await publishStagedFiles(staged.stagingDir, payloadFiles);

    const restored = new Set(payloadFiles);
    for (const name of previousFiles) {
      if (restored.has(name)) continue;
      await rm(resolvePhysicalPath(name), { force: true });
    }

    await discardStaging(staged.stagingDir);

    if (isSocketReady()) emitToUser(userId, 'backup:restored', { jobId, ...counts });
    return { jobId, ...counts };
  } catch (error) {
    await discardStaging(staged.stagingDir);
    throw error;
  }
};
