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

function isFormidableError(err: unknown): err is Error & { httpCode: number; code?: number } {
  return (
    err instanceof Error &&
    'httpCode' in err &&
    typeof (err as { httpCode?: unknown }).httpCode === 'number'
  );
}

const FORMIDABLE_CLIENT_MESSAGES: Record<number, string> = {
  1006: 'Upload form fields are too large.',
  1007: 'Upload form has too many fields.',
  1009: 'Uploaded files exceed the maximum allowed total size.',
  1015: 'Too many files uploaded.',
  1016: 'Uploaded file exceeds the maximum allowed size.',
};

function isPayloadTooLargeError(err: unknown): err is Error & { type?: string; limit?: number } {
  return (
    err instanceof Error && 'type' in err && (err as { type?: string }).type === 'entity.too.large'
  );
}

const formatByteLimit = (limit: number | undefined) =>
  typeof limit === 'number' && Number.isFinite(limit)
    ? `${Math.round((limit / (1024 * 1024)) * 10) / 10}MB`
    : 'the configured limit';

export const toHttpException = (error: unknown): HttpException => {
  if (error instanceof HttpException) {
    return error;
  }

  if (isPayloadTooLargeError(error)) {
    return new HttpException(
      413,
      `Request body is too large. Maximum allowed payload is ${formatByteLimit(error.limit)}.`,
    );
  }

  if (isFormidableError(error)) {
    if (error.httpCode >= 500 || error.code === 1018) {
      return new HttpException(500, 'Internal Server Error');
    }
    const message =
      (error.code !== undefined ? FORMIDABLE_CLIENT_MESSAGES[error.code] : undefined) ??
      'Invalid upload request.';
    return new HttpException(error.httpCode, message);
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

  return new HttpException(500, 'Internal Server Error');
};
