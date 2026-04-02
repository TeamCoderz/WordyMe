/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { copyFile, mkdir, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { resolvePhysicalPath } from '../lib/storage.js';

const getPdfContentStoragePath = (documentId: string) => {
  return `storage/pdfs/${documentId}.pdf`;
};

export const getPdfContentUrl = (documentId: string) => {
  return `/storage/pdfs/${documentId}`;
};

export const getPdfContentPhysicalPath = (documentId: string) => {
  return resolvePhysicalPath(getPdfContentStoragePath(documentId));
};

export const savePdfContent = async (temporaryFilePath: string, documentId: string) => {
  const physicalPath = getPdfContentPhysicalPath(documentId);
  await mkdir(dirname(physicalPath), { recursive: true });
  await copyFile(temporaryFilePath, physicalPath);
  return physicalPath;
};

export const deletePdfContent = async (documentId: string) => {
  const physicalPath = getPdfContentPhysicalPath(documentId);
  return await unlink(physicalPath).catch(console.error);
};
