/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { access, cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { resolvePhysicalPath } from '../lib/storage.js';
import { nanoid } from 'nanoid';
import { sanitizeStoredFilename } from '../utils/strings.js';

export const getAttachmentUrl = (documentId: string, filename: string) => {
  return `/storage/attachments/${documentId}/${filename}`;
};

export type Attachment = {
  filename: string;
  url: string;
};

export const bufferToDataURL = (buffer: Buffer): string => {
  const base64 = buffer.toString('base64');
  return `data:${'application/octet-stream'};base64,${base64}`;
};

const dataURLToBuffer = (dataURL: string): Buffer => {
  const base64Data = dataURL.split(',')[1] || dataURL;
  return Buffer.from(base64Data, 'base64');
};

export const copyDocumentAttachments = async (
  sourceDocumentId: string,
  targetDocumentId: string,
) => {
  const sourceDirectory = resolvePhysicalPath(`attachments/${sourceDocumentId}`);
  const targetDirectory = resolvePhysicalPath(`attachments/${targetDocumentId}`);

  const sourceExists = await access(sourceDirectory, constants.F_OK)
    .then(() => true)
    .catch(() => false);

  if (!sourceExists) {
    return;
  }

  await cp(sourceDirectory, targetDirectory, {
    recursive: true,
    errorOnExist: false,
  });
};

export const listDocumentAttachmentFiles = async (documentId: string) => {
  const directory = resolvePhysicalPath(`attachments/${documentId}`);

  const entries = await readdir(directory, { withFileTypes: true }).catch((error) => {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))
    .map((filename) => ({ filename, path: join(directory, filename) }));
};

export const deleteDocumentAttachments = async (documentId: string) => {
  await rm(resolvePhysicalPath(`attachments/${documentId}`), {
    recursive: true,
    force: true,
  }).catch((error) => console.error(`Failed to remove attachments for ${documentId}:`, error));
};

export const importDocumentAttachment = async (
  attachment: Attachment,
  documentId: string,
): Promise<void> => {
  const directory = resolvePhysicalPath(`attachments/${documentId}`);
  await mkdir(directory, { recursive: true });

  const buffer = dataURLToBuffer(attachment.url);
  const stored = sanitizeStoredFilename(attachment.filename);
  const dot = stored.lastIndexOf('.');
  const stem = dot > 0 ? stored.slice(0, dot) : stored;
  const extension = dot > 0 ? stored.slice(dot) : '';

  let candidate = stored;

  for (;;) {
    try {
      await writeFile(join(directory, candidate), buffer, { flag: 'wx' });
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      candidate = `${stem}_${nanoid(6)}${extension}`;
    }
  }
};
