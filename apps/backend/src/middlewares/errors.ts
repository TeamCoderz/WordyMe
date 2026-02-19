/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { ErrorRequestHandler, RequestHandler } from 'express';
import { toHttpException } from '../utils/errors.js';
import { HttpNotFound, HttpUnprocessableEntity } from '@httpx/exception';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);

  const httpException = toHttpException(err);

  res.status(httpException.statusCode).json({
    name: httpException.name,
    message: httpException.message,
    code: httpException.code,
    errorId: httpException.errorId,
    method: httpException.method,
    statusCode: httpException.statusCode,
    url: httpException.url,
    issues: (httpException as HttpUnprocessableEntity).issues,
  } satisfies HttpUnprocessableEntity);
};

export const notFoundHandler: RequestHandler = () => {
  throw new HttpNotFound();
};
