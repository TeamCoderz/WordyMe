/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { HttpException } from '@repo/backend/errors.js';
import { isAxiosError, type AxiosError } from 'axios';

/** Mutates AxiosError.message when the response body includes a server message (e.g. @httpx/exception JSON). */
export function applyBackendMessageToAxiosError(
  error: unknown,
): AxiosError<HttpException> | unknown {
  if (!isAxiosError<HttpException>(error)) {
    return error;
  }
  const body = error.response?.data;
  const serverMessage = body && typeof body.message === 'string' ? body.message.trim() : '';
  if (serverMessage) {
    error.message = serverMessage;
  }
  return error;
}
