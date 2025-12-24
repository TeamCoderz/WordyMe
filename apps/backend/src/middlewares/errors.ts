import { ErrorRequestHandler, RequestHandler } from 'express';
import { toHttpException } from '../utils/errors.js';
import { HttpNotFound } from '@httpx/exception';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);

  const httpException = toHttpException(err);

  const response: {
    statusCode: number;
    name: string;
    message?: string;
    issues?: unknown[];
    cause?: unknown;
  } = {
    statusCode: httpException.statusCode,
    name: httpException.name || httpException.constructor.name,
  };

  if (httpException.message) {
    response.message = httpException.message;
  }

  if ('issues' in httpException && httpException.issues) {
    response.issues = httpException.issues as unknown[];
  }

  if ('cause' in httpException && httpException.cause) {
    response.cause = httpException.cause;
  }

  res.status(httpException.statusCode).json(response);
};

export const notFoundHandler: RequestHandler = () => {
  throw new HttpNotFound();
};
