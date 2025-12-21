import { Router } from "express";
import {
  createDocumentSchema,
  documentFiltersSchema,
  documentHandleParamSchema,
  documentIdParamSchema,
  updateDocumentSchema,
} from "../schemas/documents.js";
import { requireAuth } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  createDocument,
  deleteDocument,
  getDocumentDetails,
  getLastViewedDocuments,
  getUserDocuments,
  updateDocument,
} from "../services/documents.js";
import { userHasDocument } from "../services/access.js";
import { HttpInternalServerError, HttpNotFound } from "@httpx/exception";
import {
  getCurrentRevisionByDocumentId,
  getRevisionsByDocumentId,
} from "../services/revisions.js";
import { copyDocumentSchema } from "../schemas/operations.js";
import { copyDocument } from "../services/operations.js";
import { dbWritesQueue } from "../queues/db-writes.js";
import { paginationQuerySchema } from "../schemas/pagination.js";

const router: Router = Router();

router.get(
  "/",
  validate({ query: documentFiltersSchema }),
  requireAuth,
  async (req, res) => {
    const documents = await getUserDocuments(req.user!.id, req.query);
    res.status(200).json(documents);
  },
);

router.get(
  "/last-viewed",
  validate({ query: documentFiltersSchema.and(paginationQuerySchema) }),
  requireAuth,
  async (req, res) => {
    const result = await getLastViewedDocuments(req.user!.id, req.query);
    res.status(200).json(result);
  },
);

router.post(
  "/",
  requireAuth,
  validate({ body: createDocumentSchema }),
  async (req, res) => {
    const { parentId, spaceId } = req.body;
    if (parentId && !(await userHasDocument(req.user!.id, parentId))) {
      throw new HttpNotFound("Parent document not found");
    }
    if (spaceId && !(await userHasDocument(req.user!.id, spaceId))) {
      throw new HttpNotFound("Space document not found");
    }

    const document = await createDocument(req.body, req.user!.id);
    res.status(201).json(document);
  },
);

router.get(
  "/handle/:handle",
  requireAuth,
  validate({ params: documentHandleParamSchema }),
  async (req, res) => {
    const document = await getDocumentDetails(req.params, req.user!.id);
    if (!document) {
      throw new HttpNotFound("Document not found");
    }
    res.status(200).json(document);
  },
);

router.get(
  "/:documentId",
  requireAuth,
  validate({ params: documentIdParamSchema }),
  async (req, res) => {
    const document = await getDocumentDetails(req.params, req.user!.id);
    if (!document) {
      throw new HttpNotFound("Document not found");
    }
    res.status(200).json(document);
  },
);

router.patch(
  "/:documentId",
  requireAuth,
  validate({ body: updateDocumentSchema, params: documentIdParamSchema }),
  async (req, res) => {
    if (!(await userHasDocument(req.user!.id, req.params.documentId))) {
      throw new HttpNotFound("Document not found");
    }

    const { parentId, spaceId } = req.body;
    if (parentId && !(await userHasDocument(req.user!.id, parentId))) {
      throw new HttpNotFound("Parent document not found");
    }
    if (spaceId && !(await userHasDocument(req.user!.id, spaceId))) {
      throw new HttpNotFound("Space document not found");
    }

    const updatedDocument = await updateDocument(
      req.params.documentId,
      req.body,
    );
    res.status(200).json(updatedDocument);
  },
);

router.delete(
  "/:documentId",
  requireAuth,
  validate({ params: documentIdParamSchema }),
  async (req, res) => {
    if (!(await userHasDocument(req.user!.id, req.params.documentId))) {
      throw new HttpNotFound("Document not found");
    }
    await deleteDocument(req.params.documentId);
    res.status(204).send();
  },
);

router.get(
  "/:documentId/revisions",
  requireAuth,
  validate({ params: documentIdParamSchema }),
  async (req, res) => {
    if (!(await userHasDocument(req.user!.id, req.params.documentId))) {
      throw new HttpNotFound("Document not found");
    }
    const revisions = await getRevisionsByDocumentId(req.params.documentId);
    res.status(200).json(revisions);
  },
);

router.get(
  "/:documentId/revisions/current",
  requireAuth,
  validate({ params: documentIdParamSchema }),
  async (req, res) => {
    if (!(await userHasDocument(req.user!.id, req.params.documentId))) {
      throw new HttpNotFound("Document not found");
    }
    const revision = await getCurrentRevisionByDocumentId(
      req.params.documentId,
    );
    if (!revision) {
      throw new HttpNotFound("Revision not found");
    }
    res.status(200).json(revision);
  },
);

router.post(
  "/:documentId/copy",
  requireAuth,
  validate({ params: documentIdParamSchema, body: copyDocumentSchema }),
  async (req, res) => {
    if (!(await userHasDocument(req.user!.id, req.params.documentId))) {
      throw new HttpNotFound("Document not found");
    }
    const copiedDocument = await dbWritesQueue.add(() =>
      copyDocument(req.params.documentId, req.body, req.user!.id),
    );
    if (!copiedDocument) {
      throw new HttpInternalServerError("Document copy failed");
    }
    res.status(201).json(copiedDocument);
  },
);

export { router as documentsRouter };
