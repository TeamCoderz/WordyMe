/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { createWriteStream } from 'node:fs';
import { copyFile, unlink } from 'node:fs/promises';
import { mkdir, readFile, readdir, rename, rm, stat, statfs, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import yauzl from 'yauzl';
import { HttpInsufficientStorage, HttpUnprocessableEntity } from '@httpx/exception';
import { resolvePhysicalPath } from '../../lib/storage.js';
import {
  BACKUP_TABLES,
  COMMIT_MARKER,
  FREE_SPACE_CHECK_INTERVAL_BYTES,
  FREE_SPACE_FACTOR,
  FREE_SPACE_FLOOR_BYTES,
  MANIFEST_ENTRY,
  MAX_MANIFEST_BYTES,
  STAGING_ROOT,
} from './constants.js';
import {
  EntryRejected,
  ExtractionGuard,
  isDirectoryEntry,
  resolveStagedPath,
} from './entry-gate.js';
import { validateManifest, type BackupManifest } from './manifest.js';

type StagedArchive = {
  manifest: BackupManifest;
  stagingDir: string;
  stagedFiles: string[];
};

const freeBytes = async (target: string) => {
  const info = await statfs(target);
  return Number(info.bsize) * Number(info.bavail);
};

const readEntryBuffer = async (zipFile: yauzl.ZipFile, entry: yauzl.Entry, cap: number) => {
  const stream = await new Promise<NodeJS.ReadableStream>((resolve, reject) => {
    zipFile.openReadStream(entry, (error, value) =>
      error ? reject(error) : resolve(value as NodeJS.ReadableStream),
    );
  });

  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of stream) {
    total += (chunk as Buffer).byteLength;
    if (total > cap) {
      throw new EntryRejected(entry.fileName, `exceeds the ${cap} byte limit`);
    }
    chunks.push(chunk as Buffer);
  }

  return Buffer.concat(chunks);
};

export const stageArchive = async (
  archivePath: string,
  jobId: string,
  targetSchemaVersion: string,
  onProgress?: (staged: number, total: number) => void,
): Promise<StagedArchive> => {
  const stagingDir = path.join(STAGING_ROOT, jobId);
  await mkdir(stagingDir, { recursive: true });

  const zipFile = await yauzl.openPromise(archivePath, {
    lazyEntries: true,
    autoClose: false,
    validateEntrySizes: true,
  });

  const guard = new ExtractionGuard();
  const stagedFiles: string[] = [];
  let manifest: BackupManifest | null = null;
  let bytesSinceSpaceCheck = 0;
  let entriesSeen = 0;
  let expectedEntries = 0;

  try {
    await new Promise<void>((resolve, reject) => {
      const fail = (error: unknown) => reject(error);

      zipFile.on('error', fail);
      zipFile.on('end', resolve);

      zipFile.on('entry', (entry: yauzl.Entry) => {
        void (async () => {
          try {
            if (isDirectoryEntry(entry.fileName)) {
              zipFile.readEntry();
              return;
            }

            entriesSeen += 1;
            guard.admit(entry.fileName, entry.externalFileAttributes);

            if (entry.fileName === MANIFEST_ENTRY) {
              if (entriesSeen !== 1) {
                throw new EntryRejected(entry.fileName, 'must be the first entry in the archive');
              }

              const raw = await readEntryBuffer(zipFile, entry, MAX_MANIFEST_BYTES);
              let parsed: unknown;
              try {
                parsed = JSON.parse(raw.toString('utf8'));
              } catch {
                throw new HttpUnprocessableEntity('The manifest is not valid JSON.');
              }

              const result = validateManifest(parsed, targetSchemaVersion);
              if (!result.ok) throw new HttpUnprocessableEntity(result.rejection.message);
              manifest = result.manifest;

              const available = await freeBytes(STAGING_ROOT);
              const required = manifest.bytes.uncompressed * FREE_SPACE_FACTOR;
              if (available < required) {
                throw new HttpInsufficientStorage(
                  `This restore needs about ${Math.ceil(required / 1024 / 1024)} MB of free space but only ${Math.floor(available / 1024 / 1024)} MB is available.`,
                );
              }

              expectedEntries =
                manifest.inventory.revisions.length +
                Object.values(manifest.inventory.attachments).reduce((n, f) => n + f.length, 0) +
                manifest.inventory.images.length +
                manifest.inventory.covers.length +
                BACKUP_TABLES.length;

              zipFile.readEntry();
              return;
            }

            if (!manifest) {
              throw new EntryRejected(entry.fileName, 'appears before the manifest');
            }

            guard.checkRatio(entry.fileName, entry.uncompressedSize, entry.compressedSize);

            const destination = resolveStagedPath(stagingDir, entry.fileName);
            await mkdir(path.dirname(destination), { recursive: true });

            const readStream = await new Promise<NodeJS.ReadableStream>((res, rej) => {
              zipFile.openReadStream(entry, (error, value) =>
                error ? rej(error) : res(value as NodeJS.ReadableStream),
              );
            });

            let written = 0;
            const counter = async function* () {
              for await (const chunk of readStream) {
                written += (chunk as Buffer).byteLength;
                guard.checkEntryTotal(entry.fileName, written);
                guard.countBytes(entry.fileName, (chunk as Buffer).byteLength);

                bytesSinceSpaceCheck += (chunk as Buffer).byteLength;
                if (bytesSinceSpaceCheck >= FREE_SPACE_CHECK_INTERVAL_BYTES) {
                  bytesSinceSpaceCheck = 0;
                  const available = await freeBytes(STAGING_ROOT);
                  if (available < FREE_SPACE_FLOOR_BYTES) {
                    throw new HttpInsufficientStorage(
                      'Ran out of disk space while unpacking the backup. Nothing was changed.',
                    );
                  }
                }

                yield chunk as Buffer;
              }
            };

            await pipeline(counter(), createWriteStream(destination));
            stagedFiles.push(entry.fileName);
            onProgress?.(stagedFiles.length, expectedEntries);

            zipFile.readEntry();
          } catch (error) {
            fail(error);
          }
        })();
      });

      zipFile.readEntry();
    });
  } catch (error) {
    zipFile.close();
    await discardStaging(stagingDir);
    throw error;
  }

  zipFile.close();

  if (!manifest) {
    throw new HttpUnprocessableEntity('This archive has no manifest and is not a WordyMe backup.');
  }

  return { manifest, stagingDir, stagedFiles };
};

export const verifyStagedCompleteness = async (staged: StagedArchive) => {
  const { manifest, stagingDir, stagedFiles } = staged;
  const present = new Set(stagedFiles);
  const problems: string[] = [];

  const expected: string[] = [
    ...manifest.inventory.revisions.map((id) => `revisions/${id}.json`),
    ...Object.entries(manifest.inventory.attachments).flatMap(([documentId, names]) =>
      names.map((name) => `attachments/${documentId}/${name}`),
    ),
    ...manifest.inventory.images.map((name) => `images/${name}`),
    ...manifest.inventory.covers.map((name) => `covers/${name}`),
  ];

  for (const entryName of expected) {
    if (!present.has(entryName)) problems.push(`missing ${entryName}`);
  }

  const expectedSet = new Set(expected);
  for (const entryName of stagedFiles) {
    if (entryName.startsWith('db/')) continue;
    if (!expectedSet.has(entryName)) problems.push(`unlisted ${entryName}`);
  }

  for (const table of BACKUP_TABLES) {
    const declared = manifest.counts[table] !== undefined;
    const stagedPath = path.join(stagingDir, 'db', `${table}.ndjson`);
    const isStaged = await stat(stagedPath).then(
      () => true,
      () => false,
    );

    if (declared && !isStaged) problems.push(`missing db/${table}.ndjson`);
    if (!declared && isStaged) problems.push(`db/${table}.ndjson is not declared in the manifest`);
  }

  if (problems.length > 0) {
    const preview = problems.slice(0, 5).join('; ');
    throw new HttpUnprocessableEntity(
      `This backup is incomplete (${problems.length} problem(s)): ${preview}. Nothing was changed.`,
    );
  }
};

export type PublishEntry = { entry: string; destination: string };

const asPublishEntry = (value: string | PublishEntry): PublishEntry =>
  typeof value === 'string' ? { entry: value, destination: value } : value;

export const writeCommitMarker = async (stagingDir: string, files: PublishEntry[]) => {
  await writeFile(path.join(stagingDir, COMMIT_MARKER), JSON.stringify({ files }), 'utf8');
};

const moveFile = async (source: string, destination: string) => {
  try {
    await rename(source, destination);
    return;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return;
    if (code !== 'EXDEV') throw error;
  }

  await copyFile(source, destination);
  await unlink(source).catch(() => undefined);
};

export const publishStagedFiles = async (stagingDir: string, files: (string | PublishEntry)[]) => {
  for (const value of files) {
    const { entry, destination } = asPublishEntry(value);
    const source = path.join(stagingDir, entry);
    const target = resolvePhysicalPath(destination);

    await mkdir(path.dirname(target), { recursive: true });
    await moveFile(source, target);
  }
};

export const discardStaging = async (stagingDir: string) => {
  await rm(stagingDir, { recursive: true, force: true });
};

export const recoverStagingOnBoot = async () => {
  let directories: string[];
  try {
    directories = await readdir(STAGING_ROOT);
  } catch {
    return;
  }

  for (const name of directories) {
    const stagingDir = path.join(STAGING_ROOT, name);
    const markerPath = path.join(stagingDir, COMMIT_MARKER);

    let marker: { files?: (string | PublishEntry)[] };
    try {
      marker = JSON.parse(await readFile(markerPath, 'utf8')) as {
        files?: (string | PublishEntry)[];
      };
    } catch {
      await discardStaging(stagingDir);
      continue;
    }

    try {
      console.warn(`Resuming an interrupted backup restore in ${name}.`);
      await publishStagedFiles(stagingDir, marker.files ?? []);
      await discardStaging(stagingDir);
      console.warn('Interrupted restore published successfully.');
    } catch (error) {
      console.error(
        `Could not finish publishing restore ${name}; keeping its staged files for the next start.`,
        error,
      );
    }
  }
};
