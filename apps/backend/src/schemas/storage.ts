/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import z from 'zod';
import { documentIdParamSchema } from './documents.js';

export const storageFilenameSchema = z
  .string()
  .min(1)
  .max(255)
  .refine(
    (value) =>
      !/[/\\\0]/.test(value) &&
      value !== '.' &&
      value !== '..' &&
      !value.startsWith('.') &&
      value.trim().length > 0,
    'Invalid filename.',
  );

export const storageUserIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, 'Invalid user id.');

export const attachmentFileParamSchema = documentIdParamSchema.extend({
  filename: storageFilenameSchema,
});

export const userFileParamSchema = z.object({
  userId: storageUserIdSchema,
  filename: storageFilenameSchema,
});

export type AttachmentFileParams = z.output<typeof attachmentFileParamSchema>;
export type UserFileParams = z.output<typeof userFileParamSchema>;
