import { cp, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { resolvePhysicalPath } from '../lib/storage.js';

export const getAttachmentUrl = (documentId: string, filename: string) => {
  return `/storage/attachments/${documentId}/${filename}`;
};

export type Attachment = {
  filename: string;
  url: string;
};

const bufferToDataURL = (buffer: Buffer): string => {
  const base64 = buffer.toString('base64');
  return `data:${'application/octet-stream'};base64,${base64}`;
};

export const copyDocumentAttachments = async (
  sourceDocumentId: string,
  targetDocumentId: string,
) => {
  const sourceDirectory = resolvePhysicalPath(`attachments/${sourceDocumentId}`);
  const targetDirectory = resolvePhysicalPath(`attachments/${targetDocumentId}`);

  return await cp(sourceDirectory, targetDirectory, {
    recursive: true,
    errorOnExist: false,
  });
};

export const exportDocumentAttachments = async (documentId: string): Promise<Attachment[]> => {
  const directory = resolvePhysicalPath(`attachments/${documentId}`);

  const entries = await readdir(directory, { withFileTypes: true }).catch((error) => {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  });

  const filenames = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  if (filenames.length === 0) return [];

  const filePromises = filenames.map(async (filename) => {
    const buffer = await readFile(join(directory, filename));
    return { filename, url: bufferToDataURL(buffer) };
  });

  const attachments = await Promise.all(filePromises);
  return attachments;
};
