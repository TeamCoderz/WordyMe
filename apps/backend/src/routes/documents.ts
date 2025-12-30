import { Router } from 'express';
import {
  createDocumentSchema,
  createDocumentWithRevisionSchema,
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
  createDocumentWithRevision,
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
import { copyDocumentSchema, importDocumentSchema } from '../schemas/operations.js';
import { copyDocument, exportDocumentTree, importDocumentTree } from '../services/operations.js';
import { dbWritesQueue } from '../queues/db-writes.js';
import { paginationQuerySchema } from '../schemas/pagination.js';

const router: Router = Router();

router.use(requireAuth);

router.get('/', validate({ query: documentFiltersSchema }), async (req, res) => {
  const documents = await getUserDocuments(req.user!.id, req.query);
  res.status(200).json(documents);
});

router.get(
  '/last-viewed',
  validate({ query: documentFiltersSchema.and(paginationQuerySchema) }),
  async (req, res) => {
    const result = await getLastViewedDocuments(req.user!.id, req.query);
    res.status(200).json(result);
  },
);

router.post('/', validate({ body: createDocumentSchema }), async (req, res) => {
  const { parentId, spaceId } = req.body;
  if (parentId && !(await userHasDocument(req.user!.id, parentId))) {
    throw new HttpNotFound(
      'The specified parentId or spaceId does not exist or is not accessible by the authenticated user.',
    );
  }
  if (spaceId && !(await userHasDocument(req.user!.id, spaceId))) {
    throw new HttpNotFound(
      'The specified parentId or spaceId does not exist or is not accessible by the authenticated user.',
    );
  }

  const document = await createDocument(req.body, req.user!.id);
  res.status(201).json(document);
});

router.post(
  '/with-revision',
  validate({ body: createDocumentWithRevisionSchema }),
  async (req, res) => {
    const document = await createDocumentWithRevision(req.body, req.user!.id);
    res.status(201).json(document);
  },
);

router.get(
  '/handle/:handle',
  validate({ params: documentHandleParamSchema, query: getSingleDocumentOptionsSchema }),
  async (req, res) => {
    const document = await getDocumentDetails({ handle: req.params.handle }, req.user!.id);
    if (!document) {
      throw new HttpNotFound('Document with the specified handle not found or not accessible.');
    }
    if (req.query.updateLastViewed === true) {
      dbWritesQueue.add(() => viewDocument(document.id, req.user!.id));
    }
    res.status(200).json(document);
  },
);

router.get('/:documentId', validate({ params: documentIdParamSchema }), async (req, res) => {
  const document = await getDocumentDetails(req.params, req.user!.id);
  if (!document) {
    throw new HttpNotFound('Document not found or the user does not have access to it.');
  }
  res.status(200).json(document);
});

router.patch(
  '/:documentId/',
  validate({ body: updateDocumentSchema, params: documentIdParamSchema }),
  async (req, res) => {
    if (!(await userHasDocument(req.user!.id, req.params.documentId))) {
      throw new HttpNotFound(
        'The document does not exist or is not accessible by the authenticated user.',
      );
    }

    const { parentId, spaceId } = req.body;

    if (parentId && !(await userHasDocument(req.user!.id, parentId))) {
      throw new HttpNotFound(
        'The document, specified parentId does not exist or is not accessible by the authenticated user.',
      );
    }
    if (spaceId && !(await userHasDocument(req.user!.id, spaceId))) {
      throw new HttpNotFound(
        'The document, specified spaceId does not exist or is not accessible by the authenticated user.',
      );
    }

    const updatedDocument = await updateDocument(req.params.documentId, req.body);
    res.status(200).json(updatedDocument);
  },
);

router.delete('/:documentId', validate({ params: documentIdParamSchema }), async (req, res) => {
  if (!(await userHasDocument(req.user!.id, req.params.documentId))) {
    throw new HttpNotFound(
      'The document does not exist or is not accessible by the authenticated user.',
    );
  }

  const documentCount = await getUserDocumentCount(req.user!.id);
  if (documentCount <= 1) {
    throw new HttpUnprocessableEntity({
      message:
        'Cannot delete the last remaining document. Users must have at least one document in their workspace.',
    });
  }

  await deleteDocument(req.params.documentId);
  res.status(204).send();
});

router.get(
  '/:documentId/revisions',
  validate({ params: documentIdParamSchema }),
  async (req, res) => {
    if (!(await userHasDocument(req.user!.id, req.params.documentId))) {
      throw new HttpNotFound(
        'The document does not exist or is not accessible by the authenticated user.',
      );
    }
    const revisions = await getRevisionsByDocumentId(req.params.documentId);
    if (revisions.length === 0) {
      throw new HttpNotFound('No revisions found for this document.');
    }
    res.status(200).json(revisions);
  },
);

router.get(
  '/:documentId/revisions/current',
  validate({ params: documentIdParamSchema }),
  async (req, res) => {
    if (!(await userHasDocument(req.user!.id, req.params.documentId))) {
      throw new HttpNotFound(
        'The document does not exist or is not accessible by the authenticated user.',
      );
    }
    const revision = await getCurrentRevisionByDocumentId(req.params.documentId);
    if (!revision) {
      throw new HttpNotFound(
        'No current revision exists for this document (document may be empty or newly created).',
      );
    }
    res.status(200).json(revision);
  },
);

router.post(
  '/:documentId/copy',
  validate({ params: documentIdParamSchema, body: copyDocumentSchema }),
  async (req, res) => {
    if (!(await userHasDocument(req.user!.id, req.params.documentId))) {
      throw new HttpNotFound(
        'The document does not exist or is not accessible by the authenticated user.',
      );
    }
    const copiedDocument = await dbWritesQueue.add(() =>
      copyDocument(req.params.documentId, req.body, req.user!.id),
    );
    if (!copiedDocument) {
      throw new HttpInternalServerError(
        'Internal server error. The copy operation failed unexpectedly.',
      );
    }
    res.status(201).json(copiedDocument);
  },
);

router.post(
  '/:documentId/export',
  validate({ params: documentIdParamSchema }),
  async (req, res) => {
    if (!(await userHasDocument(req.user!.id, req.params.documentId))) {
      throw new HttpNotFound(
        'The document does not exist or is not accessible by the authenticated user.',
      );
    }
    const exportedDocument = await exportDocumentTree(req.params.documentId);
    if (!exportedDocument) {
      throw new HttpInternalServerError(
        'Internal server error. The export operation failed unexpectedly.',
      );
    }
    res.status(200).json(exportedDocument);
  },
);

router.post('/import', validate({ body: importDocumentSchema }), async (req, res) => {
  const { spaceId, parentId } = req.body;

  if (parentId && !(await userHasDocument(req.user!.id, parentId))) {
    throw new HttpNotFound(
      'The specified parentId does not exist or is not accessible by the authenticated user.',
    );
  }
  if (spaceId && !(await userHasDocument(req.user!.id, spaceId))) {
    throw new HttpNotFound(
      'The specified spaceId does not exist or is not accessible by the authenticated user.',
    );
  }

  if (req.body.type !== req.body.document.type) {
    throw new HttpUnprocessableEntity(
      `Document type mismatch: expected ${req.body.type}, got ${req.body.document.type}`,
    );
  }

  const importedDocument = await importDocumentTree(req.body, req.user!.id);

  res.status(201).json(importedDocument);
});

export { router as documentsRouter };
