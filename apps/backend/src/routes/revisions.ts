/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Router } from 'express';
import formidable from 'formidable';
import { mkdir } from 'node:fs/promises';
import { validate } from '../middlewares/validate.js';
import { requireAuth } from '../middlewares/auth.js';
import {
  createRevisionSchema,
  createRevisionUploadFieldsSchema,
  updateRevisionSchema,
  revisionIdParamSchema,
} from '../schemas/revisions.js';
import {
  createRevision,
  createRevisionFromUpload,
  getRevisionById,
  updateRevisionName,
  deleteRevisionById,
} from '../services/revisions.js';
import { HttpNotFound, HttpUnprocessableEntity } from '@httpx/exception';
import { getUserDocumentType, userHasDocument, userHasRevision } from '../services/access.js';
import { documentTypeOperations } from '../models/documents.js';
import { resolvePhysicalPath } from '../lib/storage.js';
import { safeFilename } from '../utils/strings.js';

const router: Router = Router();

router.use(requireAuth);

router.post('/upload', async (req, res) => {
  const uploadDir = resolvePhysicalPath('revisions/uploads');
  await mkdir(uploadDir, { recursive: true });

  const form = formidable({
    uploadDir,
    multiples: false,
    maxFiles: 1,
    maxFileSize: 50 * 1024 * 1024,
    keepExtensions: true,
    filename: safeFilename,
  });

  form.on('fileBegin', (name) => {
    if (name !== 'content') {
      throw new HttpUnprocessableEntity({
        message:
          'Invalid upload. Either no file was provided or the field name was incorrect (expected "content").',
      });
    }
  });

  const [fields, files] = await form.parse(req);
  const uploadedContent = files.content;

  if (!uploadedContent || (Array.isArray(uploadedContent) && uploadedContent.length === 0)) {
    throw new HttpUnprocessableEntity({
      message:
        'Invalid upload. Either no file was provided or the field name was incorrect (expected "content").',
    });
  }

  const contentFile = Array.isArray(uploadedContent) ? uploadedContent[0] : uploadedContent;
  const normalizedFields = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  const parsedFields = createRevisionUploadFieldsSchema.parse(normalizedFields);

  const contentType =
    parsedFields.contentType ??
    (contentFile.mimetype === 'application/pdf'
      ? 'application/pdf'
      : contentFile.mimetype === 'application/json'
        ? 'application/json'
        : undefined);

  if (!contentType) {
    throw new HttpUnprocessableEntity({
      message: 'Unsupported revision content type. Provide a PDF or JSON upload.',
    });
  }

  if (!(await userHasDocument(req.user!.id, parsedFields.documentId))) {
    throw new HttpNotFound(
      'The document does not exist or is not accessible by the authenticated user.',
    );
  }

  const documentType = await getUserDocumentType(req.user!.id, parsedFields.documentId);

  if (!documentType) {
    throw new HttpNotFound(
      'The document does not exist or is not accessible by the authenticated user.',
    );
  }

  if (!documentTypeOperations[documentType].hasRevisions) {
    throw new HttpUnprocessableEntity({
      message: 'This document type does not support revisions.',
    });
  }

  const revision = await createRevisionFromUpload(
    {
      ...parsedFields,
      contentType,
      contentFilePath: contentFile.filepath,
    },
    req.user!.id,
  );

  res.status(201).json(revision);
});

router.post('/', validate({ body: createRevisionSchema }), async (req, res) => {
  if (!(await userHasDocument(req.user!.id, req.body.documentId))) {
    throw new HttpNotFound(
      'The document does not exist or is not accessible by the authenticated user.',
    );
  }

  const documentType = await getUserDocumentType(req.user!.id, req.body.documentId);

  if (!documentType) {
    throw new HttpNotFound(
      'The document does not exist or is not accessible by the authenticated user.',
    );
  }

  if (!documentTypeOperations[documentType].hasRevisions) {
    throw new HttpUnprocessableEntity({
      message: 'This document type does not support revisions.',
    });
  }

  const revision = await createRevision(req.body, req.user!.id);
  res.status(201).json(revision);
});

router.get('/:revisionId', validate({ params: revisionIdParamSchema }), async (req, res) => {
  if (!(await userHasRevision(req.user!.id, req.params.revisionId))) {
    throw new HttpNotFound(
      'The revision does not exist or is not accessible by the authenticated user.',
    );
  }
  const revision = await getRevisionById(req.params.revisionId, true);
  res.status(200).json(revision);
});

router.patch(
  '/:revisionId',
  validate({ body: updateRevisionSchema, params: revisionIdParamSchema }),
  async (req, res) => {
    if (!(await userHasRevision(req.user!.id, req.params.revisionId))) {
      throw new HttpNotFound(
        'The revision does not exist or is not accessible by the authenticated user.',
      );
    }
    const updatedRevision = await updateRevisionName(req.params.revisionId, req.body);
    res.status(200).json(updatedRevision);
  },
);

router.delete('/:revisionId', validate({ params: revisionIdParamSchema }), async (req, res) => {
  if (!(await userHasRevision(req.user!.id, req.params.revisionId))) {
    throw new HttpNotFound(
      'The revision does not exist or is not accessible by the authenticated user.',
    );
  }
  await deleteRevisionById(req.params.revisionId);
  res.status(204).send();
});

export { router as revisionsRouter };
