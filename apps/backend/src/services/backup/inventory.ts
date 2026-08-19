/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '../../lib/db.js';
import { resolvePhysicalPath } from '../../lib/storage.js';
import { documentsTable } from '../../models/documents.js';
import { revisionsTable } from '../../models/revisions.js';
import { userImagesTable } from '../../models/user-images.js';
import { storageFilenameSchema } from '../../schemas/storage.js';
import type { BackupManifest } from '../../schemas/backup.js';

const ROW_BYTES_ESTIMATE = 512;

type BackupInventory = BackupManifest['inventory'];

type InventoryResult = {
  inventory: BackupInventory;
  missing: string[];
  fileBytes: number;
  documentIds: string[];
};

const sizeOf = async (physicalPath: string) => {
  try {
    const stats = await stat(physicalPath);
    return stats.isFile() ? stats.size : null;
  } catch {
    return null;
  }
};

const listDirectory = async (physicalPath: string) => {
  try {
    const entries = await readdir(physicalPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => storageFilenameSchema.safeParse(name).success)
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
};

export const collectInventory = async (userId: string): Promise<InventoryResult> => {
  const documents = await db
    .select({ id: documentsTable.id })
    .from(documentsTable)
    .where(eq(documentsTable.userId, userId));

  const revisions = await db
    .select({ id: revisionsTable.id })
    .from(revisionsTable)
    .where(eq(revisionsTable.userId, userId));

  const images = await db
    .select({ imageType: userImagesTable.imageType, imagePath: userImagesTable.path })
    .from(userImagesTable)
    .where(eq(userImagesTable.userId, userId));

  const inventory: BackupInventory = { revisions: [], attachments: {}, images: [], covers: [] };
  const missing: string[] = [];
  let fileBytes = 0;

  for (const revision of revisions) {
    const size = await sizeOf(resolvePhysicalPath(`revisions/${revision.id}.json`));
    if (size === null) {
      missing.push(`revisions/${revision.id}.json`);
      continue;
    }
    inventory.revisions.push(revision.id);
    fileBytes += size;
  }

  for (const document of documents) {
    const directory = resolvePhysicalPath(`attachments/${document.id}`);
    const filenames = await listDirectory(directory);
    if (filenames.length === 0) continue;

    const kept: string[] = [];
    for (const filename of filenames) {
      const size = await sizeOf(path.join(directory, filename));
      if (size === null) {
        missing.push(`attachments/${document.id}/${filename}`);
        continue;
      }
      kept.push(filename);
      fileBytes += size;
    }

    if (kept.length > 0) inventory.attachments[document.id] = kept;
  }

  for (const image of images) {
    if (!image.imagePath) continue;
    const filename = path.basename(image.imagePath);
    if (!storageFilenameSchema.safeParse(filename).success) continue;

    const bucket = image.imageType === 'cover' ? 'covers' : 'images';
    const size = await sizeOf(resolvePhysicalPath(`${bucket}/${userId}/${filename}`));
    if (size === null) {
      missing.push(`${bucket}/${filename}`);
      continue;
    }

    inventory[bucket].push(filename);
    fileBytes += size;
  }

  return {
    inventory,
    missing,
    fileBytes,
    documentIds: documents.map((document) => document.id),
  };
};

export const estimateUncompressedBytes = (fileBytes: number, rowCount: number) =>
  fileBytes + rowCount * ROW_BYTES_ESTIMATE;
