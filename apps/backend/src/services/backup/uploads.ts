/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { appendFile, mkdir, rm, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import {
  HttpForbidden,
  HttpNotFound,
  HttpPayloadTooLarge,
  HttpUnprocessableEntity,
} from '@httpx/exception';
import { CHUNK_BYTES, MAX_RESTORE_BYTES, UPLOAD_ROOT } from './constants.js';

const UPLOAD_TTL_MS = 24 * 60 * 60_000;

type Upload = {
  id: string;
  userId: string;
  archivePath: string;
  nextIndex: number;
  bytes: number;
  touchedAt: number;
  claimed: boolean;
};

const uploads = new Map<string, Upload>();
const chains = new Map<string, Promise<unknown>>();

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export const beginUpload = async (userId: string) => {
  for (const [id, upload] of uploads) {
    if (upload.userId === userId && !upload.claimed) {
      await rm(path.dirname(upload.archivePath), { recursive: true, force: true });
      uploads.delete(id);
      chains.delete(id);
    }
  }

  const id = randomUUID();
  const directory = path.join(UPLOAD_ROOT, id);
  await mkdir(directory, { recursive: true });

  uploads.set(id, {
    id,
    userId,
    archivePath: path.join(directory, 'upload.zip'),
    nextIndex: 0,
    bytes: 0,
    touchedAt: Date.now(),
    claimed: false,
  });

  return { uploadId: id, chunkBytes: CHUNK_BYTES };
};

const requireUpload = (uploadId: string, userId: string) => {
  if (!isUuid(uploadId)) throw new HttpUnprocessableEntity('Invalid upload id.');

  const upload = uploads.get(uploadId);
  if (!upload) throw new HttpNotFound('This upload has expired. Start the restore again.');
  if (upload.userId !== userId) throw new HttpForbidden('This upload belongs to another account.');

  return upload;
};

const appendChunkLocked = async (
  uploadId: string,
  userId: string,
  index: number,
  chunk: Buffer,
) => {
  const upload = requireUpload(uploadId, userId);

  if (!Number.isInteger(index) || index < 0) {
    throw new HttpUnprocessableEntity('Invalid chunk index.');
  }

  if (index === upload.nextIndex - 1) {
    return { nextIndex: upload.nextIndex, bytes: upload.bytes };
  }

  if (index !== upload.nextIndex) {
    throw new HttpUnprocessableEntity(
      `Chunk ${index} arrived out of order; expected ${upload.nextIndex}.`,
    );
  }

  if (upload.bytes + chunk.byteLength > MAX_RESTORE_BYTES) {
    await rm(path.dirname(upload.archivePath), { recursive: true, force: true });
    uploads.delete(uploadId);
    throw new HttpPayloadTooLarge(
      `This backup is larger than the ${MAX_RESTORE_BYTES} byte limit.`,
    );
  }

  await appendFile(upload.archivePath, chunk);
  upload.nextIndex += 1;
  upload.bytes += chunk.byteLength;
  upload.touchedAt = Date.now();

  return { nextIndex: upload.nextIndex, bytes: upload.bytes };
};

export const appendChunk = (uploadId: string, userId: string, index: number, chunk: Buffer) => {
  const previous = chains.get(uploadId) ?? Promise.resolve();
  const next = previous.then(() => appendChunkLocked(uploadId, userId, index, chunk));

  chains.set(
    uploadId,
    next.catch(() => undefined),
  );

  return next;
};

export const uploadStatus = (uploadId: string, userId: string) => {
  const upload = requireUpload(uploadId, userId);
  return { nextIndex: upload.nextIndex, bytes: upload.bytes };
};

export const takeUpload = async (uploadId: string, userId: string) => {
  const upload = requireUpload(uploadId, userId);

  const exists = await stat(upload.archivePath).catch(() => null);
  if (!exists || exists.size === 0) {
    throw new HttpUnprocessableEntity('No backup data was uploaded.');
  }

  upload.claimed = true;
  return upload.archivePath;
};

export const discardUpload = async (uploadId: string) => {
  const upload = uploads.get(uploadId);
  if (!upload) return;

  uploads.delete(uploadId);
  chains.delete(uploadId);
  await rm(path.dirname(upload.archivePath), { recursive: true, force: true });
};

export const sweepUploads = async () => {
  const now = Date.now();

  for (const [id, upload] of uploads) {
    if (now - upload.touchedAt > UPLOAD_TTL_MS) await discardUpload(id);
  }

  await rm(UPLOAD_ROOT, { recursive: true, force: true }).catch(() => undefined);
};
