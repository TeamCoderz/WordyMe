/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { NextFunction, Request, RequestHandler, Response } from 'express';
import { auth } from '../lib/auth.js';
import { fromNodeHeaders } from 'better-auth/node';
import { HttpUnauthorized } from '@httpx/exception';
import { ExtendedError, Socket } from 'socket.io';

type Session = typeof auth.$Infer.Session;

declare global {
  namespace Express {
    interface Request {
      user?: Session['user'];
      session?: Session['session'];
    }
  }
}

declare module 'socket.io' {
  interface Socket {
    user: Session['user'];
    session: Session['session'];
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

export const ioRequireAuth = async (socket: Socket, next: (err?: ExtendedError) => void) => {
  try {
    const headers = fromNodeHeaders(socket.handshake.headers);
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw new HttpUnauthorized();
    }

    socket.user = session.user;
    socket.session = session.session;

    next();
  } catch (err) {
    next(err as ExtendedError);
  }
};
