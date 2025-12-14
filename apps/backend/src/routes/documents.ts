import { Router } from "express";
import validate from "../middlewares/validate.js";
import {
  createDocumentSchema,
  documentIdParamSchema,
  updateDocumentSchema,
} from "../schemas/documents.js";
import { requireAuth } from "../middlewares/auth.js";
import {
  createDocument,
  deleteDocument,
  updateDocument,
} from "../services/documents.js";
import { hasDocumentAccess } from "../services/access.js";
import { HttpForbidden } from "@httpx/exception";

const router: Router = Router();

router.post(
  "/",
  requireAuth,
  validate({ body: createDocumentSchema }),
  async (req, res) => {
    const document = await createDocument(req.body, req.user!.id);
    res.status(201).json(document);
  },
);

router.patch(
  "/:documentId",
  requireAuth,
  validate({ body: updateDocumentSchema, params: documentIdParamSchema }),
  async (req, res) => {
    if (!(await hasDocumentAccess(req.user!.id, req.params.documentId))) {
      throw new HttpForbidden();
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
    if (!(await hasDocumentAccess(req.user!.id, req.params.documentId))) {
      throw new HttpForbidden();
    }
    await deleteDocument(req.params.documentId);
    res.status(204).send();
  },
);

export { router as documentsRouter };
