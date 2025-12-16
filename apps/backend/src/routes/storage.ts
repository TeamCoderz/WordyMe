import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";
import { revisionIdParamSchema } from "../schemas/revisions.js";
import { userHasRevision } from "../services/access.js";
import { HttpNotFound } from "@httpx/exception";
import { resolvePhysicalPath } from "../lib/storage.js";
import { getRevisionContentUrl } from "../services/revision-contents.js";

const router = Router();

router.get(
  "/revisions/:revisionId",
  requireAuth,
  validate({ params: revisionIdParamSchema }),
  async (req, res) => {
    if (!(await userHasRevision(req.user!.id, req.params.revisionId))) {
      throw new HttpNotFound("Revision not found");
    }

    res.sendFile(
      resolvePhysicalPath(getRevisionContentUrl(req.params.revisionId)),
    );
  },
);

export { router as storageRouter };
