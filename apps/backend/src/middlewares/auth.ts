import { RequestHandler } from "express";
import { auth } from "../lib/auth.js";
import { fromNodeHeaders } from "better-auth/node";
import { HttpUnauthorized } from "@httpx/exception";
import { InferSession, InferUser } from "better-auth";

declare global {
    namespace Express {
        interface Request {
            user?: InferUser<typeof auth>;
            session?: InferSession<typeof auth>;
        }
    }
}

export const requireAuth: RequestHandler = async (req, res, next) => {
    const headers = fromNodeHeaders(req.headers);
    const session = await auth.api.getSession({ headers });

    if (!session) {
        throw new HttpUnauthorized();
    }

    req.user = session.user;
    req.session = session.session;

    next();
};
