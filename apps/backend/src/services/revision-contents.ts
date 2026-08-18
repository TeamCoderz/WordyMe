/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { mkdir, readFile, writeFile, unlink } from 'fs/promises';
import { HttpInternalServerError } from '@httpx/exception';
import { resolvePhysicalPath } from '../lib/storage.js';
import { dirname } from 'path';

export const getRevisionContentUrl = (revisionId: string) => {
  return `storage/revisions/${revisionId}.json`;
};

export const getRevisionContentPhysicalPath = (revisionId: string) => {
  return resolvePhysicalPath(getRevisionContentUrl(revisionId));
};

export const readRevisionContent = async (revisionId: string) => {
  const physicalPath = resolvePhysicalPath(getRevisionContentUrl(revisionId));

  try {
    const buffer = await readFile(physicalPath);
    return buffer.toString();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;

    console.error(`Revision content missing for revision ${revisionId} at ${physicalPath}`);

    throw new HttpInternalServerError(
      `The stored content for revision ${revisionId} is missing from the storage volume. It was expected at ${getRevisionContentUrl(revisionId)}. Restore that file from a backup, or open an older revision of this document.`,
    );
  }
};

export const saveRevisionContent = async (content: string, revisionId: string) => {
  const physicalPath = resolvePhysicalPath(getRevisionContentUrl(revisionId));
  await mkdir(dirname(physicalPath), { recursive: true });
  await writeFile(physicalPath, content);
  return physicalPath;
};

export const deleteRevisionContent = async (revisionId: string) => {
  const physicalPath = resolvePhysicalPath(getRevisionContentUrl(revisionId));
  return await unlink(physicalPath).catch((error) => {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    console.error(`Failed to remove revision content ${revisionId}:`, error);
  });
};
