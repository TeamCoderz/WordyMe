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
  deleteRevisionById,
} from "../services/revisions.js";
import { HttpNotFound } from "@httpx/exception";
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
  }
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
    res.status(200).json(revision);
  }
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
      req.body
    );
    res.status(200).json(updatedRevision);
  }
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
  }
);

export { router as revisionsRouter };
