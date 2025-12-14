import { Router } from "express";
import validate from "../middlewares/validate.js";
import { requireAuth } from "../middlewares/auth.js";
import {
  createRevisionSchema,
  updateRevisionInput,
  revisionIdParamSchema,
} from "../schemas/revisions.js";
import {
  createRevision,
  getRevisionById,
  updateRevisionName,
  getRevisionsByDocumentId,
  getCurrentRevisionByDocumentId,
  deleteRevisionById,
} from "../services/revisions.js";
import { HttpNotFound } from "@httpx/exception";
import { documentIdParamSchema } from "../schemas/documents.js";
import { userHasDocument, userHasRevision } from "../services/access.js";

const router: Router = Router();

router.post(
  "/",
  requireAuth,
  validate({ body: createRevisionSchema }),
  async (req, res) => {
    if (!(await userHasDocument(req.user!.id, req.body.documentId))) {
      throw new HttpNotFound("Document not found");
    }
    const revision = await createRevision(req.body, req.user!.id);
    res.status(201).json(revision);
  },
);

router.get(
  "/revisions/:documentId",
  requireAuth,
  validate({ params: documentIdParamSchema }),
  async (req, res) => {
    if (!(await userHasDocument(req.user!.id, req.params.documentId))) {
      throw new HttpNotFound("Document not found");
    }
    const revisions = await getRevisionsByDocumentId(req.params.documentId);
    if (revisions.length === 0) {
      throw new HttpNotFound("Revisions not found");
    }
    res.status(200).json(revisions);
  },
);

router.get(
  "/current-revision/:documentId",
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

router.get(
  "/:revisionId",
  requireAuth,
  validate({ params: revisionIdParamSchema }),
  async (req, res) => {
    if (!(await userHasRevision(req.user!.id, req.params.revisionId))) {
      throw new HttpNotFound("Revision not found");
    }
    const revision = await getRevisionById(req.params.revisionId);
    if (!revision) {
      throw new HttpNotFound("Revision not found");
    }
    res.status(200).json(revision);
  },
);

router.patch(
  "/:revisionId",
  requireAuth,
  validate({ body: updateRevisionInput, params: revisionIdParamSchema }),
  async (req, res) => {
    if (!(await userHasRevision(req.user!.id, req.params.revisionId))) {
      throw new HttpNotFound("Revision not found");
    }
    const updatedRevision = await updateRevisionName(
      req.params.revisionId,
      req.body,
    );
    if (!updatedRevision) {
      throw new HttpNotFound("Revision not found");
    }
    res.status(200).json(updatedRevision);
  },
);

router.delete(
  "/:revisionId",
  requireAuth,
  validate({ params: revisionIdParamSchema }),
  async (req, res) => {
    if (!(await userHasRevision(req.user!.id, req.params.revisionId))) {
      throw new HttpNotFound("Revision not found");
    }
    await deleteRevisionById(req.params.revisionId);

    res.status(204).send();
  },
);

export { router as revisionsRouter };
