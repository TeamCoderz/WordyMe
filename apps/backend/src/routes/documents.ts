import { Router } from 'express';
import {
  createDocumentSchema,
  documentFiltersSchema,
  documentHandleParamSchema,
  documentIdParamSchema,
  getSingleDocumentOptionsSchema,
  updateDocumentSchema,
} from '../schemas/documents.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createDocument,
  deleteDocument,
  getDocumentDetails,
  getLastViewedDocuments,
  getUserDocumentCount,
  getUserDocuments,
  updateDocument,
  viewDocument,
} from '../services/documents.js';
import { userHasDocument } from '../services/access.js';
import { HttpInternalServerError, HttpNotFound, HttpUnprocessableEntity } from '@httpx/exception';
import { getCurrentRevisionByDocumentId, getRevisionsByDocumentId } from '../services/revisions.js';
import { copyDocumentSchema } from '../schemas/operations.js';
import { copyDocument } from '../services/operations.js';
import { dbWritesQueue } from '../queues/db-writes.js';
import { paginationQuerySchema } from '../schemas/pagination.js';

const router: Router = Router();

router.get('/', validate({ query: documentFiltersSchema }), requireAuth, async (req, res) => {
  const documents = await getUserDocuments(req.user!.id, req.query);
  res.status(200).json(documents);
});

router.get(
  '/last-viewed',
  validate({ query: documentFiltersSchema.and(paginationQuerySchema) }),
  requireAuth,
  async (req, res) => {
    const result = await getLastViewedDocuments(req.user!.id, req.query);
    res.status(200).json(result);
  },
);

router.post('/', requireAuth, validate({ body: createDocumentSchema }), async (req, res) => {
  const { parentId, spaceId } = req.body;
  if (parentId && !(await userHasDocument(req.user!.id, parentId))) {
    throw new HttpNotFound('Parent document not found or not accessible');
  }
  if (spaceId && !(await userHasDocument(req.user!.id, spaceId))) {
    throw new HttpNotFound('Space document not found or not accessible');
  }

  const document = await createDocument(req.body, req.user!.id);
  res.status(201).json(document);
});

router.get(
  '/handle/:handle',
  validate({ params: documentHandleParamSchema, query: getSingleDocumentOptionsSchema }),
  requireAuth,
  async (req, res) => {
    const document = await getDocumentDetails(req.params, req.user!.id);
    if (!document) {
      throw new HttpNotFound('Document not found for the provided handle');
    }
    if (req.query.updateLastViewed) {
      dbWritesQueue.add(() => viewDocument(document.id, req.user!.id));
    }
    res.status(200).json(document);
  },
);

router.get(
  '/:documentId',
  requireAuth,
  validate({ params: documentIdParamSchema }),
  async (req, res) => {
    const document = await getDocumentDetails(req.params, req.user!.id);
    if (!document) {
      throw new HttpNotFound('Document not found or not accessible');
    }
    res.status(200).json(document);
  },
);

router.patch(
  '/:documentId',
  requireAuth,
  validate({ body: updateDocumentSchema, params: documentIdParamSchema }),
  async (req, res) => {
    if (!(await userHasDocument(req.user!.id, req.params.documentId))) {
      throw new HttpNotFound('Document not found or not accessible');
    }

    const { parentId, spaceId } = req.body;
    if (parentId && !(await userHasDocument(req.user!.id, parentId))) {
      throw new HttpNotFound('Parent document not found or not accessible');
    }
    if (spaceId && !(await userHasDocument(req.user!.id, spaceId))) {
      throw new HttpNotFound('Space container not found or not accessible');
    }

    const updatedDocument = await updateDocument(req.params.documentId, req.body);
    res.status(200).json(updatedDocument);
  },
);

router.delete(
  '/:documentId',
  requireAuth,
  validate({ params: documentIdParamSchema }),
  async (req, res) => {
    if (!(await userHasDocument(req.user!.id, req.params.documentId))) {
      throw new HttpNotFound('Document not found or not accessible');
    }

    const documentCount = await getUserDocumentCount(req.user!.id);

    if (documentCount <= 1) {
      throw new HttpUnprocessableEntity(
        'Cannot delete the last remaining document. You must have at least one document.',
      );
    }

    await deleteDocument(req.params.documentId);
    res.status(204).send();
  },
);

router.get(
  '/:documentId/revisions',
  requireAuth,
  validate({ params: documentIdParamSchema }),
  async (req, res) => {
    if (!(await userHasDocument(req.user!.id, req.params.documentId))) {
      throw new HttpNotFound('Document not found or not accessible');
    }
    const revisions = await getRevisionsByDocumentId(req.params.documentId);
    res.status(200).json(revisions);
  },
);

router.get(
  '/:documentId/revisions/current',
  requireAuth,
  validate({ params: documentIdParamSchema }),
  async (req, res) => {
    if (!(await userHasDocument(req.user!.id, req.params.documentId))) {
      throw new HttpNotFound('Document not found or not accessible');
    }
    const revision = await getCurrentRevisionByDocumentId(req.params.documentId);
    if (!revision) {
      throw new HttpNotFound('No current revision available for this document');
    }
    res.status(200).json(revision);
  },
);

router.post(
  '/:documentId/copy',
  requireAuth,
  validate({ params: documentIdParamSchema, body: copyDocumentSchema }),
  async (req, res) => {
    if (!(await userHasDocument(req.user!.id, req.params.documentId))) {
      throw new HttpNotFound('Document not found or not accessible');
    }
    const copiedDocument = await dbWritesQueue.add(() =>
      copyDocument(req.params.documentId, req.body, req.user!.id),
    );
    if (!copiedDocument) {
      throw new HttpInternalServerError('Unable to copy document at this time');
    }
    res.status(201).json(copiedDocument);
  },
);

export { router as documentsRouter };
