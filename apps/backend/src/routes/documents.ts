import { Router } from "express";
import validate from "../middlewares/validate.js";
import {
  createDocumentSchema,
  documentHandleParamSchema,
  documentIdParamSchema,
  updateDocumentSchema,
} from "../schemas/documents.js";
import { requireAuth } from "../middlewares/auth.js";
import {
  createDocument,
  deleteDocument,
  getDocumentDetails,
  getUserDocuments,
  updateDocument,
} from "../services/documents.js";
import { userHasDocument } from "../services/access.js";
import { HttpNotFound } from "@httpx/exception";
import {
  getCurrentRevisionByDocumentId,
  getRevisionsByDocumentId,
} from "../services/revisions.js";

const router: Router = Router();

router.get("/", requireAuth, async (req, res) => {
  const documents = await getUserDocuments(req.user!.id);
  res.status(200).json(documents);
});

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

export { router as documentsRouter };
