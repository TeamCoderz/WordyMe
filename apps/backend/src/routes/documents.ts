import { Router } from "express";
import validate from "../middlewares/validate.js";
import { documents } from "@repo/schemas";

const router: Router = Router();

router.post(
    '/',
    validate({ body: documents.createDocumentSchema }),
    (req, res) => {
    }
);

export { router as documentsRouter };
