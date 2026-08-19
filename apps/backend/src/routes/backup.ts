/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Router } from 'express';
import { HttpPayloadTooLarge } from '@httpx/exception';
import { pipeline } from 'node:stream/promises';
import { requireAuth } from '../middlewares/auth.js';
import { MAX_BACKUP_BYTES } from '../services/backup/constants.js';
import { backupFilename, buildManifest, createBackupArchive } from '../services/backup/export.js';
import { acquireBackupJob } from '../services/backup/lock.js';
import {
  appendChunk,
  beginUpload,
  discardUpload,
  takeUpload,
  uploadStatus,
} from '../services/backup/uploads.js';
import { runRestore } from '../services/backup/restore.js';
import { startRestoreJob, getRestoreJob, updateRestoreProgress } from '../services/backup/jobs.js';

const router: Router = Router();

router.use(requireAuth);

router.get('/preview', async (req, res) => {
  const manifest = await buildManifest(req.user!.id);
  res.status(200).json({
    counts: manifest.counts,
    documentTypes: manifest.documentTypes,
    missing: manifest.missing,
    bytes: manifest.bytes,
    createdAt: manifest.createdAt,
  });
});

router.get('/export', async (req, res) => {
  const job = acquireBackupJob('export', req.user!.id);

  try {
    const manifest = await buildManifest(req.user!.id);

    if (manifest.bytes.uncompressed > MAX_BACKUP_BYTES) {
      throw new HttpPayloadTooLarge(
        `This workspace is ${manifest.bytes.uncompressed} bytes, above the ${MAX_BACKUP_BYTES} byte export limit.`,
      );
    }

    res.status(200);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${backupFilename()}"`);
    res.setHeader('Cache-Control', 'no-store');

    const archive = createBackupArchive(manifest, req.user!.id);
    archive.outputStream.on('data', () => job.touch());

    await pipeline(archive.outputStream, res);
  } catch (error) {
    if (res.headersSent) {
      console.error('Backup export failed mid-stream:', error);
      if (!res.destroyed) res.destroy();
      return;
    }
    throw error;
  } finally {
    job.release();
  }
});

router.post('/restore/begin', async (req, res) => {
  res.status(201).json(await beginUpload(req.user!.id));
});

router.put('/restore/chunk', async (req, res) => {
  const uploadId = String(req.query.uploadId ?? '');
  const index = Number(req.query.index);
  const chunk = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);

  res.status(200).json(await appendChunk(uploadId, req.user!.id, index, chunk));
});

router.get('/restore/status', (req, res) => {
  res.status(200).json(uploadStatus(String(req.query.uploadId ?? ''), req.user!.id));
});

router.post('/restore/commit', async (req, res) => {
  const uploadId = String(req.query.uploadId ?? '');
  const userId = req.user!.id;
  const archivePath = await takeUpload(uploadId, userId);
  const job = acquireBackupJob('restore', userId);

  const jobId = startRestoreJob(userId, async (id) => {
    try {
      return await runRestore(archivePath, userId, id, (phase, staged, total) => {
        job.touch();
        updateRestoreProgress(id, phase, staged, total);
      });
    } finally {
      job.release();
      await discardUpload(uploadId);
    }
  });

  res.status(202).json({ jobId });
});

router.get('/restore/job', (req, res) => {
  res.status(200).json(getRestoreJob(String(req.query.jobId ?? ''), req.user!.id));
});

export { router as backupRouter };
