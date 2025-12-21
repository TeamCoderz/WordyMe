import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import { requireAuth } from '../middlewares/auth.js';
import { editorSettingsSchema } from '../schemas/editor-settings.js';
import { setEditorSettings } from '../services/editor-settings.js';

const router: Router = Router();

router.patch('/', requireAuth, validate({ body: editorSettingsSchema }), async (req, res) => {
  const updated = await setEditorSettings(req.user!.id, req.body);
  res.status(200).json(updated);
});

export { router as editorSettingsRouter };
