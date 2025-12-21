import { NextFunction, Request, RequestHandler, Response } from 'express';
import { auth } from '../lib/auth.js';
import { fromNodeHeaders } from 'better-auth/node';
import { HttpUnauthorized } from '@httpx/exception';
import { InferSession, InferUser } from 'better-auth';

declare global {
  namespace Express {
    interface Request {
      user?: InferUser<typeof auth>;
      session?: InferSession<typeof auth>;
    }
  }
}

export const requireAuth = async <P, R, B, Q>(
  req: Request<P, R, B, Q>,
  res: Response<R>,
  next: NextFunction,
) => {
  const headers = fromNodeHeaders(req.headers);
  const session = await auth.api.getSession({ headers });

  if (!session) {
    throw new HttpUnauthorized();
  }

  req.user = session.user;
  req.session = session.session;

  next();
};
