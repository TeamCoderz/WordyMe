import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import { requireAuth } from '../middlewares/auth.js';
import {
  createRevisionSchema,
  updateRevisionSchema,
  revisionIdParamSchema,
} from '../schemas/revisions.js';
import {
  createRevision,
  getRevisionById,
  updateRevisionName,
  deleteRevisionById,
} from '../services/revisions.js';
import { HttpUnauthorized } from '@httpx/exception';
import { userHasDocument, userHasRevision } from '../services/access.js';

const router: Router = Router();

router.use(requireAuth);

router.post('/', validate({ body: createRevisionSchema }), async (req, res) => {
  if (!(await userHasDocument(req.user!.id, req.body.documentId))) {
    throw new HttpUnauthorized(
      'Unauthorized. The document does not exist or is not accessible by the authenticated user.',
    );
  }
  const revision = await createRevision(req.body, req.user!.id);
  res.status(201).json(revision);
});

router.get('/:revisionId', validate({ params: revisionIdParamSchema }), async (req, res) => {
  if (!(await userHasRevision(req.user!.id, req.params.revisionId))) {
    throw new HttpUnauthorized(
      'Unauthorized. The revision does not exist or is not accessible by the authenticated user.',
    );
  }
  const revision = await getRevisionById(req.params.revisionId);
  res.status(200).json(revision);
});

router.patch(
  '/:revisionId',
  validate({ body: updateRevisionSchema, params: revisionIdParamSchema }),
  async (req, res) => {
    if (!(await userHasRevision(req.user!.id, req.params.revisionId))) {
      throw new HttpUnauthorized(
        'Unauthorized. The revision does not exist or is not accessible by the authenticated user.',
      );
    }
    const updatedRevision = await updateRevisionName(req.params.revisionId, req.body);
    res.status(200).json(updatedRevision);
  },
);

router.delete('/:revisionId', validate({ params: revisionIdParamSchema }), async (req, res) => {
  if (!(await userHasRevision(req.user!.id, req.params.revisionId))) {
    throw new HttpUnauthorized(
      'Unauthorized. The revision does not exist or is not accessible by the authenticated user.',
    );
  }
  await deleteRevisionById(req.params.revisionId);
  res.status(204).send();
});

export { router as revisionsRouter };
