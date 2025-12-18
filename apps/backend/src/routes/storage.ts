import { Router } from "express";
import formidable from "formidable";
import { requireAuth } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";
import { revisionIdParamSchema } from "../schemas/revisions.js";
import { userHasDocument, userHasRevision } from "../services/access.js";
import { HttpNotFound, HttpUnprocessableEntity } from "@httpx/exception";
import { resolvePhysicalPath } from "../lib/storage.js";
import { getRevisionContentUrl } from "../services/revision-contents.js";
import { documentIdParamSchema } from "../schemas/documents.js";
import { mkdir } from "node:fs/promises";
import z from "zod";
import { getAttachmentUrl } from "../services/attachments.js";

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

router.post(
  "/attachments/:documentId",
  requireAuth,
  validate({ params: documentIdParamSchema }),
  async (req, res) => {
    const { documentId } = req.params;

    if (!(await userHasDocument(req.user!.id, documentId))) {
      throw new HttpNotFound("Document not found");
    }

    const uploadDir = resolvePhysicalPath(`attachments/${documentId}`);

    await mkdir(uploadDir, { recursive: true });

    const form = formidable({
      uploadDir,
      multiples: false,
      maxFiles: 1,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
    });

    form.on("fileBegin", (name) => {
      if (name !== "attachments") {
        throw new HttpUnprocessableEntity("Unexpected file field");
      }
    });

    const [, files] = await form.parse(req);

    const attachments = files.attachments;

    if (!attachments || attachments.length === 0) {
      throw new HttpUnprocessableEntity("No attachments provided");
    }

    return res.status(201).json({
      url: getAttachmentUrl(documentId, attachments[0].newFilename),
    });
  },
);

router.get(
  "/attachments/:documentId/:filename",
  requireAuth,
  validate({ params: documentIdParamSchema.extend({ filename: z.string() }) }),
  async (req, res) => {
    const { documentId, filename } = req.params;

    if (!(await userHasDocument(req.user!.id, documentId))) {
      throw new HttpNotFound("Document not found");
    }

    res.sendFile(resolvePhysicalPath(getAttachmentUrl(documentId, filename)));
  },
);

export { router as storageRouter };
