import { Router } from "express";
import validate from "../middlewares/validate.js";
import { requireAuth } from "../middlewares/auth.js";
import { documentIdParamSchema } from "../schemas/favorites.js";
import {
  addDocumentToFavorites,
  removeDocumentFromFavorites,
} from "../services/favorites.js";
import { userHasDocument } from "../services/access.js";
import { HttpNotFound } from "@httpx/exception";

const router = Router();

router.post(
  "/:documentId",
  requireAuth,
  validate({ params: documentIdParamSchema }),
  async (req, res) => {
    if (!(await userHasDocument(req.user!.id, req.params.documentId))) {
      throw new HttpNotFound("Document not found");
    }
    const favorite = await addDocumentToFavorites(req.user!.id, {
      documentId: req.params.documentId,
    });
    res.status(201).json(favorite);
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
    const deleted = await removeDocumentFromFavorites(req.user!.id, {
      documentId: req.params.documentId,
    });
    if (!deleted) {
      throw new HttpNotFound("Favorite not found");
    }
    res.status(204).send();
  },
);

export { router as favoritesRouter };
