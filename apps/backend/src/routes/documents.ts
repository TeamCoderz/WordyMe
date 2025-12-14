import { Router } from "express";
import validate from "../middlewares/validate.js";
import { createDocumentSchema } from "../schemas/documents.js";

const router: Router = Router();

router.post(
    '/',
    validate({ body: createDocumentSchema }),
    (req, res) => {
    }
);

export { router as documentsRouter };
