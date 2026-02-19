/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Router } from 'express';
import formidable from 'formidable';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { revisionIdParamSchema } from '../schemas/revisions.js';
import { userHasDocument, userHasRevision } from '../services/access.js';
import { HttpNotFound, HttpUnprocessableEntity } from '@httpx/exception';
import { resolvePhysicalPath } from '../lib/storage.js';
import { getRevisionContentUrl } from '../services/revision-contents.js';
import { documentIdParamSchema } from '../schemas/documents.js';
import { mkdir } from 'node:fs/promises';
import z from 'zod';
import { getAttachmentUrl } from '../services/attachments.js';
import { safeFilename } from '../utils/strings.js';
import { imageMetaSchema } from '../schemas/images.js';
import {
  deleteUserCover,
  deleteUserImage,
  updateUserCover,
  updateUserImage,
} from '../services/images.js';

const router: Router = Router();

router.use(requireAuth);

router.get(
  '/revisions/:revisionId',
  validate({ params: revisionIdParamSchema }),
  async (req, res, next) => {
    if (!(await userHasRevision(req.user!.id, req.params.revisionId))) {
      throw new HttpNotFound(
        'The revision does not exist or is not accessible by the authenticated user.',
      );
    }

    res.sendFile(resolvePhysicalPath(getRevisionContentUrl(req.params.revisionId)), (err) => {
      if (err) next(new HttpNotFound('Revision content not found'));
    });
  },
);

router.post(
  '/attachments/:documentId',
  validate({ params: documentIdParamSchema }),
  async (req, res) => {
    const { documentId } = req.params;

    if (!(await userHasDocument(req.user!.id, documentId))) {
      throw new HttpNotFound(
        'The document does not exist or is not accessible by the authenticated user.',
      );
    }

    const uploadDir = resolvePhysicalPath(`attachments/${documentId}`);

    await mkdir(uploadDir, { recursive: true });

    const form = formidable({
      uploadDir,
      multiples: false,
      maxFiles: 1,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
      filename: safeFilename,
    });

    form.on('fileBegin', (name) => {
      if (name !== 'attachments') {
        throw new HttpUnprocessableEntity({
          message:
            'Invalid upload. Either no file was provided, the field name was incorrect (expected "attachments"), or the file exceeds the 10MB size limit.',
        });
      }
    });

    const [, files] = await form.parse(req);

    const attachments = files.attachments;

    if (!attachments || attachments.length === 0) {
      throw new HttpUnprocessableEntity({
        message:
          'Invalid upload. Either no file was provided, the field name was incorrect (expected "attachments"), or the file exceeds the 10MB size limit.',
      });
    }

    return res.status(201).json({
      url: getAttachmentUrl(documentId, attachments[0].newFilename),
    });
  },
);

router.get(
  '/attachments/:documentId/:filename',
  validate({ params: documentIdParamSchema.extend({ filename: z.string() }) }),
  async (req, res, next) => {
    const { documentId, filename } = req.params;

    if (!(await userHasDocument(req.user!.id, documentId))) {
      throw new HttpNotFound(
        'The document does not exist or is not accessible by the authenticated user.',
      );
    }

    res.sendFile(resolvePhysicalPath(getAttachmentUrl(documentId, filename)), (err) => {
      if (err) next(new HttpNotFound('Attachment not found'));
    });
  },
);

router.put('/images', async (req, res) => {
  const uploadDir = resolvePhysicalPath(`images/${req.user!.id}`);

  await mkdir(uploadDir, { recursive: true });

  const form = formidable({
    uploadDir,
    multiples: false,
    maxFiles: 1,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    keepExtensions: true,
    filename(name, ext) {
      return `image${ext}`;
    },
    filter(part) {
      return part.mimetype?.startsWith('image/') || false;
    },
  });

  form.on('fileBegin', (name) => {
    if (name !== 'image') {
      throw new HttpUnprocessableEntity({
        message:
          'Invalid upload. Either no file was provided, the field name was incorrect (expected "image").',
      });
    }
  });

  const [fields, files] = await form.parse(req);

  if (!files.image || files.image.length === 0) {
    throw new HttpUnprocessableEntity({
      message:
        'Invalid upload. Either no file was provided, the field name was incorrect (expected "image").',
    });
  }

  const meta = imageMetaSchema.parse(fields);

  res.status(200).json(await updateUserImage(req.user!.id, files.image[0].newFilename, meta));
});

router.delete('/images', async (req, res) => {
  await deleteUserImage(req.user!.id);
  res.status(204).send();
});

router.get('/images/:userId/:filename', async (req, res, next) => {
  const { userId, filename } = req.params;
  res.sendFile(resolvePhysicalPath(`images/${userId}/${filename}`), (err) => {
    if (err) next(new HttpNotFound('Profile image not found'));
  });
});

router.put('/covers', async (req, res) => {
  const uploadDir = resolvePhysicalPath(`covers/${req.user!.id}`);

  await mkdir(uploadDir, { recursive: true });

  const form = formidable({
    uploadDir,
    multiples: false,
    maxFiles: 1,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    keepExtensions: true,
    filename(name, ext) {
      return `cover${ext}`;
    },
    filter(part) {
      return part.mimetype?.startsWith('image/') || false;
    },
  });

  form.on('fileBegin', (name) => {
    if (name !== 'cover') {
      throw new HttpUnprocessableEntity({
        message:
          'Invalid upload. Either no file was provided, the field name was incorrect (expected "cover").',
      });
    }
  });

  const [fields, files] = await form.parse(req);

  if (!files.cover || files.cover.length === 0) {
    throw new HttpUnprocessableEntity({
      message:
        'Invalid upload. Either no file was provided, the field name was incorrect (expected "cover").',
    });
  }

  const meta = imageMetaSchema.parse(fields);

  res.status(200).json(await updateUserCover(req.user!.id, files.cover[0].newFilename, meta));
});

router.delete('/covers', async (req, res) => {
  await deleteUserCover(req.user!.id);
  res.status(204).send();
});

router.get('/covers/:userId/:filename', async (req, res, next) => {
  const { userId, filename } = req.params;
  res.sendFile(resolvePhysicalPath(`covers/${userId}/${filename}`), (err) => {
    if (err) next(new HttpNotFound('Cover image not found'));
  });
});

export { router as storageRouter };
