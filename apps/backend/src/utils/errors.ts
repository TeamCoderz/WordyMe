/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { HttpException, HttpUnprocessableEntity, HttpValidationIssue } from '@httpx/exception';
import { HttpError } from 'http-errors';
import { ZodError } from 'zod';

function isExpressError(err: unknown): err is HttpError {
  return (
    err instanceof Error &&
    Object.keys(err).includes('expose') &&
    Object.keys(err).includes('status')
  );
}

export const toHttpException = (error: unknown): HttpException => {
  if (error instanceof HttpException) {
    return error;
  }

  // Convert express errors to HttpException
  if (isExpressError(error)) {
    return new HttpException(error.status, error.message);
  }

  if (error instanceof ZodError) {
    return new HttpUnprocessableEntity({
      message: 'Validation failed. Please check your input and try again.',
      issues: error.issues as HttpValidationIssue[],
      cause: error,
    });
  }

  if (error instanceof Error) {
    return new HttpException(500, error.message);
  }

  return new HttpException(500, 'Internal Server Error');
};
