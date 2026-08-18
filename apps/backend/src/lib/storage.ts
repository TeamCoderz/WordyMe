/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import path from 'path';

export const STORAGE_DIR = path.join(process.cwd(), 'storage');

export const resolvePhysicalPath = (relativePath: string) => {
  const root = path.resolve(STORAGE_DIR);
  const resolvedPath = path.resolve(root, relativePath.replace(/^\/?storage(?:\/|$)/, ''));
  const relativeToRoot = path.relative(root, resolvedPath);

  if (relativeToRoot === '' || relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    throw new Error(`Path traversal detected: ${relativePath}`);
  }

  return resolvedPath;
};
