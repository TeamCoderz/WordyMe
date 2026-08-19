/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { BackupManifest } from '@repo/backend/backup.js';

const LOCAL_HEADER_SIGNATURE = 0x04034b50;
const HEADER_BYTES = 30;
const MAX_MANIFEST_BYTES = 64 * 1024;

export type BackupManifestPreview = BackupManifest;

const inflateRaw = async (bytes: Uint8Array) => {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

export const readBackupManifest = async (file: File): Promise<BackupManifestPreview> => {
  const head = new DataView(await file.slice(0, HEADER_BYTES).arrayBuffer());

  if (head.byteLength < HEADER_BYTES || head.getUint32(0, true) !== LOCAL_HEADER_SIGNATURE) {
    throw new Error('This file is not a zip archive.');
  }

  const method = head.getUint16(8, true);
  const compressedSize = head.getUint32(18, true);
  const nameLength = head.getUint16(26, true);
  const extraLength = head.getUint16(28, true);
  const nameStart = HEADER_BYTES;
  const dataStart = nameStart + nameLength + extraLength;

  const name = new TextDecoder().decode(
    await file.slice(nameStart, nameStart + nameLength).arrayBuffer(),
  );

  if (name !== 'manifest.json') {
    throw new Error('This is not a WordyMe backup: its first entry is not a manifest.');
  }

  if (compressedSize === 0 || compressedSize > MAX_MANIFEST_BYTES) {
    throw new Error('This backup has an unreadable manifest.');
  }

  const raw = new Uint8Array(await file.slice(dataStart, dataStart + compressedSize).arrayBuffer());
  const decoded = method === 0 ? raw : await inflateRaw(raw);

  if (decoded.byteLength > MAX_MANIFEST_BYTES) {
    throw new Error('This backup has an unreadable manifest.');
  }

  try {
    return JSON.parse(new TextDecoder().decode(decoded)) as BackupManifestPreview;
  } catch {
    throw new Error('This backup has a corrupt manifest.');
  }
};

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
};

export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
