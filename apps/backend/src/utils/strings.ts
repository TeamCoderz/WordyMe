/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { nanoid } from 'nanoid';

const STORED_FILENAME_MAX_LENGTH = 200;

export const slugify = (text: string) => {
  return text
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
};

export const appendUniqueSuffix = (text: string) => {
  return `${text}-${nanoid(10)}`;
};

export const safeFilename = (filename: string, extension: string) => {
  const timestamp = Date.now();
  const safeName = filename.replace(/[^a-zA-Z0-9-_]/g, '_');
  return `${safeName}_${timestamp}${extension}`;
};

export const sanitizeStoredFilename = (filename: string) => {
  const leaf = filename.split(/[/\\]/).pop() ?? '';
  const cleaned = leaf
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^\.+/, '')
    .slice(0, STORED_FILENAME_MAX_LENGTH);

  return cleaned || `attachment_${nanoid(10)}`;
};
