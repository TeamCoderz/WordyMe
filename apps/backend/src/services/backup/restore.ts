/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { randomUUID } from 'node:crypto';
import { emitToUser, isSocketReady } from '../../lib/socket.js';
import { collectInventory } from './inventory.js';
import { readSchemaVersion } from './export.js';
import { restoreDatabase } from './restore-db.js';
import {
  discardStaging,
  publishStagedFiles,
  removeObsoleteFiles,
  stageArchive,
  verifyStagedCompleteness,
  writeCommitMarker,
} from './staging.js';

const liveFilesFor = (
  inventory: Awaited<ReturnType<typeof collectInventory>>['inventory'],
  userId: string,
) => {
  const names = new Set<string>();

  for (const revisionId of inventory.revisions) names.add(`revisions/${revisionId}.json`);
  for (const [documentId, filenames] of Object.entries(inventory.attachments)) {
    for (const filename of filenames) names.add(`attachments/${documentId}/${filename}`);
  }
  for (const filename of inventory.images) names.add(`images/${userId}/${filename}`);
  for (const filename of inventory.covers) names.add(`covers/${userId}/${filename}`);

  return names;
};

const destinationFor = (entry: string, userId: string) => {
  const match = /^(images|covers)\/(.+)$/.exec(entry);
  return match ? `${match[1]}/${userId}/${match[2]}` : entry;
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
  const previousFiles = liveFilesFor(before.inventory, userId);

  const report = (
    phase: 'unpacking' | 'verifying' | 'writing' | 'publishing',
    staged = 0,
    total = 0,
  ) => {
    onPhase?.(phase, staged, total);
    if (isSocketReady()) emitToUser(userId, 'backup:progress', { jobId, phase, staged, total });
  };

  let committed = false;

  report('unpacking');
  const staged = await stageArchive(archivePath, jobId, await readSchemaVersion(), (done, total) =>
    report('unpacking', done, total),
  );

  try {
    report('verifying');
    await verifyStagedCompleteness(staged);

    const payloadFiles = staged.stagedFiles
      .filter((name) => !name.startsWith('db/'))
      .map((entry) => ({ entry, destination: destinationFor(entry, userId) }));

    const restored = new Set(payloadFiles.map((file) => file.destination));
    const obsolete = [...previousFiles].filter((name) => !restored.has(name));

    await writeCommitMarker(staged.stagingDir, jobId, payloadFiles, obsolete);

    report('writing');
    const counts = await restoreDatabase(staged.stagingDir, userId, staged.manifest, jobId);
    committed = true;

    report('publishing');
    await publishStagedFiles(staged.stagingDir, payloadFiles);

    await removeObsoleteFiles(obsolete);
    await discardStaging(staged.stagingDir);

    if (isSocketReady()) emitToUser(userId, 'backup:restored', { jobId, ...counts });
    return { jobId, ...counts };
  } catch (error) {
    if (committed) {
      console.error(
        'Restore failed after the database was updated; keeping staged files so the next start can finish publishing them.',
        error,
      );
    } else {
      await discardStaging(staged.stagingDir);
    }
    throw error;
  }
};
