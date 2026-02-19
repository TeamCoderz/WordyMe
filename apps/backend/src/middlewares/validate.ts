/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { RequestHandler } from 'express';
import { z, ZodType } from 'zod';

export function validate<
  B extends ZodType,
  Q extends ZodType,
  P extends ZodType,
  R extends ZodType,
>(schema: {
  body?: B;
  query?: Q;
  params?: P;
  res?: R;
}): RequestHandler<z.output<P>, z.output<R>, z.output<B>, z.output<Q>> {
  return (req, res, next) => {
    if (schema.body) {
      Object.defineProperty(req, 'body', {
        value: schema.body.parse(req.body),
      });
    }

    if (schema.query) {
      Object.defineProperty(req, 'query', {
        value: schema.query.parse(req.query),
      });
    }

    if (schema.params) {
      Object.defineProperty(req, 'params', {
        value: schema.params.parse(req.params),
      });
    }

    next();
  };
}
