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
import {
  HttpInternalServerError,
  HttpNotFound,
  HttpUnprocessableEntity,
  HttpUnauthorized,
} from '@httpx/exception';
import { getCurrentRevisionByDocumentId, getRevisionsByDocumentId } from '../services/revisions.js';
import { copyDocumentSchema, importDocumentSchema } from '../schemas/operations.js';
import { copyDocument, exportDocumentTree, importDocumentTree } from '../services/operations.js';
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

router.post('/create', requireAuth, validate({ body: createDocumentSchema }), async (req, res) => {
  const { parentId, spaceId } = req.body;
  if (parentId && !(await userHasDocument(req.user!.id, parentId))) {
    throw new HttpUnauthorized(
      'Unauthorized. The specified parentId or spaceId does not exist or is not accessible by the authenticated user.',
    );
  }
  if (spaceId && !(await userHasDocument(req.user!.id, spaceId))) {
    throw new HttpUnauthorized(
      'Unauthorized. The specified parentId or spaceId does not exist or is not accessible by the authenticated user.',
    );
  }

  const document = await createDocument(req.body, req.user!.id);
  res.status(201).json(document);
});

router.get(
  '/handle/:handle',
  validate({ params: documentHandleParamSchema, query: getSingleDocumentOptionsSchema }),
  requireAuth,
  async (req, res) => {
    const document = await getDocumentDetails({ handle: req.params.handle }, req.user!.id);
    if (!document) {
      throw new HttpNotFound('Document with the specified handle not found or not accessible.');
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
      throw new HttpNotFound('Document not found or the user does not have access to it.');
    }
    res.status(200).json(document);
  },
);

router.patch(
  '/:documentId/update',
  requireAuth,
  validate({ body: updateDocumentSchema, params: documentIdParamSchema }),
  async (req, res) => {
    if (!(await userHasDocument(req.user!.id, req.params.documentId))) {
      throw new HttpUnauthorized(
        'Unauthorized. The document, specified parentId, or spaceId does not exist or is not accessible by the authenticated user.',
      );
    }

    const { parentId, spaceId } = req.body;

    if (parentId && !(await userHasDocument(req.user!.id, parentId))) {
      throw new HttpUnauthorized(
        'Unauthorized. The document, specified parentId, or spaceId does not exist or is not accessible by the authenticated user.',
      );
    }
    if (spaceId && !(await userHasDocument(req.user!.id, spaceId))) {
      throw new HttpUnauthorized(
        'Unauthorized. The document, specified parentId, or spaceId does not exist or is not accessible by the authenticated user.',
      );
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
      throw new HttpUnauthorized(
        'Unauthorized. The document does not exist or is not accessible by the authenticated user.',
      );
    }

    const documentCount = await getUserDocumentCount(req.user!.id);

    if (documentCount <= 1) {
      throw new HttpUnprocessableEntity(
        'Cannot delete the last remaining document. Users must have at least one document in their workspace.',
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
      throw new HttpUnauthorized(
        'Unauthorized. The document does not exist or is not accessible by the authenticated user.',
      );
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
      throw new HttpUnauthorized(
        'Unauthorized. The document does not exist or is not accessible by the authenticated user.',
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
  requireAuth,
  validate({ params: documentIdParamSchema, body: copyDocumentSchema }),
  async (req, res) => {
    if (!(await userHasDocument(req.user!.id, req.params.documentId))) {
      throw new HttpUnauthorized(
        'Unauthorized. The document does not exist or is not accessible by the authenticated user.',
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

router.get(
  '/:documentId/export',
  requireAuth,
  validate({ params: documentIdParamSchema }),
  async (req, res) => {
    if (!(await userHasDocument(req.user!.id, req.params.documentId))) {
      throw new HttpUnauthorized(
        'Unauthorized. The document does not exist or is not accessible by the authenticated user.',
      );
    }
    const exportedDocument = await exportDocumentTree(req.params.documentId);
    res.status(200).json(exportedDocument);
  },
);

router.post('/import', requireAuth, validate({ body: importDocumentSchema }), async (req, res) => {
  const { spaceId, parentId, position, document } = req.body;

  if (parentId && !(await userHasDocument(req.user!.id, parentId))) {
    throw new HttpUnauthorized(
      'Unauthorized. The specified parentId or spaceId does not exist or is not accessible by the authenticated user.',
    );
  }
  if (spaceId && !(await userHasDocument(req.user!.id, spaceId))) {
    throw new HttpUnauthorized(
      'Unauthorized. The specified parentId or spaceId does not exist or is not accessible by the authenticated user.',
    );
  }

  const importedDocument = await importDocumentTree(
    document,
    { spaceId, parentId, position },
    req.user!.id,
  );

  res.status(201).json(importedDocument);
});

export { router as documentsRouter };
