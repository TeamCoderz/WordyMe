/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import path from 'node:path';
import { storageFilenameSchema } from '../../schemas/storage.js';
import {
  BACKUP_TABLES,
  ENTRY_PREFIXES,
  MANIFEST_ENTRY,
  MAX_ENTRIES,
  MAX_ENTRY_BYTES,
  MAX_RATIO,
  MAX_RESTORE_BYTES,
  MAX_TABLE_BYTES,
  RATIO_EXEMPT_BELOW_BYTES,
} from './constants.js';

const UNIX_MODE_FORMAT_MASK = 0o170000;
const UNIX_MODE_SYMLINK = 0o120000;
const UNIX_MODE_REGULAR = 0o100000;

const DENIED_BASENAMES = new Set(['local.db', 'local.db-wal', 'local.db-shm', 'local.db-journal']);

export class EntryRejected extends Error {
  constructor(
    readonly entryName: string,
    readonly reason: string,
  ) {
    super(`Rejected archive entry "${entryName}": ${reason}`);
    this.name = 'EntryRejected';
  }
}

export const isDirectoryEntry = (entryName: string) => entryName.endsWith('/');

const checkEntryName = (entryName: string) => {
  if (entryName.length === 0) return 'empty name';
  if (entryName.length > 1024) return 'name too long';
  if (entryName.includes('\0')) return 'contains a NUL byte';
  if (entryName.includes('\\')) return 'contains a backslash';
  if (entryName.normalize('NFC') !== entryName) return 'name is not NFC-normalised';
  if (path.posix.isAbsolute(entryName) || /^[A-Za-z]:/.test(entryName)) return 'absolute path';

  const segments = entryName.split('/');
  for (const segment of segments) {
    if (segment === '..') return 'contains a parent-directory segment';
    if (segment === '.') return 'contains a current-directory segment';
    if (segment.length > 0 && segment !== segment.trimEnd()) return 'segment ends with whitespace';
    if (segment.endsWith('.')) return 'segment ends with a dot';
  }

  if (entryName === MANIFEST_ENTRY) return null;

  if (!ENTRY_PREFIXES.some((prefix) => entryName.startsWith(prefix))) {
    return 'outside the allowed prefixes';
  }

  if (entryName.startsWith('db/')) {
    const table = entryName.slice(3).replace(/\.ndjson$/, '');
    if (segments.length !== 2 || !entryName.endsWith('.ndjson')) return 'malformed table file';
    if (!(BACKUP_TABLES as readonly string[]).includes(table)) return 'unexpected table file';
  }
  const basename = segments[segments.length - 1];
  if (DENIED_BASENAMES.has(basename.toLowerCase())) return 'targets the database file';
  if (!storageFilenameSchema.safeParse(basename).success) return 'illegal filename';

  return null;
};

const checkEntryMode = (externalFileAttributes: number) => {
  const unixMode = (externalFileAttributes >>> 16) & 0xffff;
  if (unixMode === 0) return null;

  const format = unixMode & UNIX_MODE_FORMAT_MASK;
  if (format === UNIX_MODE_SYMLINK) return 'is a symbolic link';
  if (format !== 0 && format !== UNIX_MODE_REGULAR) return 'is not a regular file';

  return null;
};

export const resolveStagedPath = (stagingRoot: string, entryName: string) => {
  const root = path.resolve(stagingRoot);
  const resolved = path.resolve(root, entryName);
  const relative = path.relative(root, resolved);

  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new EntryRejected(entryName, 'resolves outside the staging directory');
  }

  if (DENIED_BASENAMES.has(path.basename(resolved).toLowerCase())) {
    throw new EntryRejected(entryName, 'targets the database file');
  }

  return resolved;
};

export class ExtractionGuard {
  #entryCount = 0;
  #totalBytes = 0;
  #tableBytes = 0;
  readonly #seen = new Set<string>();

  admit(entryName: string, externalFileAttributes: number) {
    const nameProblem = checkEntryName(entryName);
    if (nameProblem) throw new EntryRejected(entryName, nameProblem);

    const modeProblem = checkEntryMode(externalFileAttributes);
    if (modeProblem) throw new EntryRejected(entryName, modeProblem);

    const key = entryName.toLowerCase();
    if (this.#seen.has(key)) {
      throw new EntryRejected(entryName, 'duplicate entry name');
    }
    this.#seen.add(key);

    this.#entryCount += 1;
    if (this.#entryCount > MAX_ENTRIES) {
      throw new EntryRejected(entryName, `archive exceeds ${MAX_ENTRIES} entries`);
    }
  }

  countBytes(entryName: string, byteLength: number) {
    this.#totalBytes += byteLength;

    if (entryName.startsWith('db/')) {
      this.#tableBytes += byteLength;
      if (this.#tableBytes > MAX_TABLE_BYTES) {
        throw new EntryRejected(
          entryName,
          `table data exceeds ${MAX_TABLE_BYTES} bytes; this workspace is too large to restore in one pass`,
        );
      }
    }

    if (this.#totalBytes > MAX_RESTORE_BYTES) {
      throw new EntryRejected(entryName, `archive exceeds ${MAX_RESTORE_BYTES} uncompressed bytes`);
    }
  }

  checkEntryTotal(entryName: string, written: number) {
    if (written > MAX_ENTRY_BYTES) {
      throw new EntryRejected(entryName, `entry exceeds ${MAX_ENTRY_BYTES} bytes`);
    }
  }

  checkRatio(entryName: string, uncompressed: number, compressed: number) {
    if (uncompressed < RATIO_EXEMPT_BELOW_BYTES) return;
    if (compressed <= 0) return;

    const ratio = uncompressed / compressed;
    if (ratio > MAX_RATIO) {
      throw new EntryRejected(
        entryName,
        `compression ratio ${Math.round(ratio)}:1 exceeds ${MAX_RATIO}:1`,
      );
    }
  }

  get entryCount() {
    return this.#entryCount;
  }

  get totalBytes() {
    return this.#totalBytes;
  }
}
