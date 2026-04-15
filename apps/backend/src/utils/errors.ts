/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { HttpException, HttpUnprocessableEntity, HttpValidationIssue } from '@httpx/exception';
import { HttpError } from 'http-errors';
import { ZodError } from 'zod';

function isExpressError(err: unknown): err is HttpError {
  return err instanceof Error && ('status' in err || 'statusCode' in err);
}

function isPayloadTooLargeError(err: unknown): err is Error & { type?: string } {
  return (
    err instanceof Error && 'type' in err && (err as { type?: string }).type === 'entity.too.large'
  );
}

export const toHttpException = (error: unknown): HttpException => {
  if (error instanceof HttpException) {
    return error;
  }

  if (isPayloadTooLargeError(error)) {
    return new HttpException(
      413,
      'Request body is too large. Maximum allowed payload is 5MB. Please reduce the import size and try again.',
    );
  }

  if (isExpressError(error)) {
    const status = typeof error.status === 'number' ? error.status : error.statusCode;
    return new HttpException(status ?? 500, error.message);
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
