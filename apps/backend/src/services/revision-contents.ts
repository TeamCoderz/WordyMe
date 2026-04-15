/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { cp, mkdir, readFile, writeFile, unlink } from 'fs/promises';
import { resolvePhysicalPath } from '../lib/storage.js';
import { dirname } from 'path';
import { RevisionContentType } from '../models/revisions.js';

export const getRevisionContentExtension = (contentType: RevisionContentType) => {
  return contentType === 'application/pdf' ? 'pdf' : 'json';
};

export const getRevisionContentUrl = (
  revisionId: string,
  contentType: RevisionContentType = 'application/json',
) => {
  return `storage/revisions/${revisionId}.${getRevisionContentExtension(contentType)}`;
};

export const getRevisionContentPhysicalPath = (
  revisionId: string,
  contentType: RevisionContentType = 'application/json',
) => {
  return resolvePhysicalPath(getRevisionContentUrl(revisionId, contentType));
};

const dataUrlToBuffer = (dataUrl: string) => {
  const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  return Buffer.from(base64Data, 'base64');
};

const bufferToDataUrl = (buffer: Buffer, mimeType: string) => {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
};

export const readRevisionContent = async (
  revisionId: string,
  contentType: RevisionContentType = 'application/json',
) => {
  const physicalPath = resolvePhysicalPath(getRevisionContentUrl(revisionId, contentType));
  const buffer = await readFile(physicalPath);
  return contentType === 'application/pdf'
    ? bufferToDataUrl(buffer, 'application/pdf')
    : buffer.toString();
};

export const saveRevisionContent = async (
  content: string,
  revisionId: string,
  contentType: RevisionContentType = 'application/json',
) => {
  const physicalPath = resolvePhysicalPath(getRevisionContentUrl(revisionId, contentType));
  await mkdir(dirname(physicalPath), { recursive: true });
  await writeFile(
    physicalPath,
    contentType === 'application/pdf' ? dataUrlToBuffer(content) : content,
  );
  return physicalPath;
};

export const saveRevisionContentFromFile = async (
  sourceFilePath: string,
  revisionId: string,
  contentType: RevisionContentType = 'application/json',
) => {
  const physicalPath = resolvePhysicalPath(getRevisionContentUrl(revisionId, contentType));
  await mkdir(dirname(physicalPath), { recursive: true });
  await cp(sourceFilePath, physicalPath);
  await unlink(sourceFilePath).catch(() => undefined);
  return physicalPath;
};

export const copyRevisionContent = async (
  sourceRevisionId: string,
  targetRevisionId: string,
  contentType: RevisionContentType = 'application/json',
) => {
  const sourcePhysicalPath = resolvePhysicalPath(
    getRevisionContentUrl(sourceRevisionId, contentType),
  );
  const targetPhysicalPath = resolvePhysicalPath(
    getRevisionContentUrl(targetRevisionId, contentType),
  );
  await mkdir(dirname(targetPhysicalPath), { recursive: true });
  await cp(sourcePhysicalPath, targetPhysicalPath);
  return targetPhysicalPath;
};

export const deleteRevisionContent = async (
  revisionId: string,
  contentType: RevisionContentType = 'application/json',
) => {
  const physicalPath = resolvePhysicalPath(getRevisionContentUrl(revisionId, contentType));
  return await unlink(physicalPath).catch(console.error);
};
