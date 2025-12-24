import { ErrorRequestHandler, RequestHandler } from 'express';
import { toHttpException } from '../utils/errors.js';
import { HttpNotFound } from '@httpx/exception';
import { env } from '../env.js';
import { errorSchema, type ErrorSchema } from '../schemas/errors.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);

  const httpException = toHttpException(err);

  const response: ErrorSchema = {
    statusCode: httpException.statusCode,
    name: httpException.name || httpException.constructor.name,
  };

  if (httpException.message) {
    response.message = httpException.message;
  }

  if ('issues' in httpException && httpException.issues) {
    response.issues = httpException.issues as unknown[];
  }

  if (env.NODE_ENV === 'development' && 'cause' in httpException && httpException.cause) {
    response.cause = httpException.cause;
  }

  const validatedResponse = errorSchema.parse(response);
  res.status(httpException.statusCode).json(validatedResponse);
};

export const notFoundHandler: RequestHandler = () => {
  throw new HttpNotFound();
};
