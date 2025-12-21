import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import { requireAuth } from '../middlewares/auth.js';
import { documentIdParamSchema } from '../schemas/favorites.js';
import {
  addDocumentToFavorites,
  listFavorites,
  removeDocumentFromFavorites,
} from '../services/favorites.js';
import { userHasDocument } from '../services/access.js';
import { HttpNotFound } from '@httpx/exception';
import { documentFiltersSchema } from '../schemas/documents.js';
import { paginationQuerySchema } from '../schemas/pagination.js';

const router = Router();

router.get(
  '/',
  validate({ query: documentFiltersSchema.and(paginationQuerySchema) }),
  requireAuth,
  async (req, res) => {
    const result = await listFavorites(req.user!.id, req.query);
    res.status(200).json(result);
  },
);

router.post(
  '/:documentId',
  requireAuth,
  validate({ params: documentIdParamSchema }),
  async (req, res) => {
    if (!(await userHasDocument(req.user!.id, req.params.documentId))) {
      throw new HttpNotFound('Document not found');
    }
    const favorite = await addDocumentToFavorites(req.user!.id, req.params.documentId);
    res.status(201).json(favorite);
  },
);

router.delete(
  '/:documentId',
  requireAuth,
  validate({ params: documentIdParamSchema }),
  async (req, res) => {
    if (!(await userHasDocument(req.user!.id, req.params.documentId))) {
      throw new HttpNotFound('Document not found');
    }
    await removeDocumentFromFavorites(req.user!.id, req.params.documentId);
    res.status(204).send();
  },
);

export { router as favoritesRouter };
