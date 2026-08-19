/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { NextFunction, Request, Response } from 'express';
import { HttpServiceUnavailable } from '@httpx/exception';
import { isRestoreRunning } from '../services/backup/lock.js';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const restoreGate = (req: Request, _res: Response, next: NextFunction) => {
  if (READ_METHODS.has(req.method)) return next();
  if (req.path.startsWith('/backup/')) return next();

  if (isRestoreRunning()) {
    throw new HttpServiceUnavailable(
      'A backup restore is in progress. Your workspace is read-only until it finishes.',
    );
  }

  next();
};
