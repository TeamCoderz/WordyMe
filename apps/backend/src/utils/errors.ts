import { HttpException, HttpUnprocessableEntity, HttpValidationIssue } from '@httpx/exception';
import { ZodError } from 'zod';

export const toHttpException = (error: unknown): HttpException => {
  if (error instanceof HttpException) {
    return error;
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
