/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { eq } from 'drizzle-orm';
import { db } from '../lib/db.js';
import { users } from '../models/auth.js';
import { ImageMeta } from '../schemas/images.js';
import { resolvePhysicalPath } from '../lib/storage.js';
import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

export const getUserImageUrl = async (userId: string, filename: string) => {
  return `storage/images/${userId}/${filename}`;
};

export const getUserCoverUrl = async (userId: string, filename: string) => {
  return `storage/covers/${userId}/${filename}`;
};

const pruneSiblings = async (directory: string, keep: string) => {
  const entries = await readdir(directory).catch(() => [] as string[]);

  await Promise.all(
    entries
      .filter((entry) => entry !== keep)
      .map((entry) =>
        rm(join(directory, entry), { force: true }).catch((error) =>
          console.error(`Failed to remove stale upload ${entry}:`, error),
        ),
      ),
  );
};

export const updateUserImage = async (userId: string, filename: string, imageMeta: ImageMeta) => {
  const imageUrl = await getUserImageUrl(userId, filename);

  await db.update(users).set({ image: imageUrl, imageMeta }).where(eq(users.id, userId));
  await pruneSiblings(resolvePhysicalPath(`images/${userId}`), filename);

  return { url: imageUrl, meta: imageMeta };
};

export const deleteUserImage = async (userId: string) => {
  await db.update(users).set({ image: null, imageMeta: {} }).where(eq(users.id, userId));
  await rm(resolvePhysicalPath(`images/${userId}`), { recursive: true, force: true });
};

export const updateUserCover = async (userId: string, filename: string, coverMeta: ImageMeta) => {
  const coverUrl = await getUserCoverUrl(userId, filename);

  await db.update(users).set({ cover: coverUrl, coverMeta }).where(eq(users.id, userId));
  await pruneSiblings(resolvePhysicalPath(`covers/${userId}`), filename);

  return { url: coverUrl, meta: coverMeta };
};

export const deleteUserCover = async (userId: string) => {
  await db.update(users).set({ cover: null, coverMeta: {} }).where(eq(users.id, userId));
  await rm(resolvePhysicalPath(`covers/${userId}`), { recursive: true, force: true });
};
