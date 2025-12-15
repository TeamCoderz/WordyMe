import { Router } from "express";
import validate from "../middlewares/validate.js";
import { requireAuth } from "../middlewares/auth.js";
import { HttpNotFound } from "@httpx/exception";
import { updateEditorSettings } from "../services/editor-settings.js";
import { updateEditorSettingsSchema } from "../schemas/editor-settings.js";

const router: Router = Router();

router.patch(
  "/",
  requireAuth,
  validate({ body: updateEditorSettingsSchema }),
  async (req, res) => {
    const updated = await updateEditorSettings(req.user!.id, req.body);
    if (!updated) {
      throw new HttpNotFound("Editor settings not found for this user");
    }
    res.status(200).json(updated);
  },
);

export { router as editorSettingsRouter };
