/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { z } from 'zod';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/jpg',
];

// file schema
export const logoImageFileSchema = z
  .instanceof(File)
  .refine(
    (file) => {
      return ALLOWED_MIME_TYPES.includes(file.type);
    },
    {
      message: `Unsupported file type. Only ${ALLOWED_MIME_TYPES.join(', ')} are allowed.`,
    },
  )
  .refine(
    (file) => {
      return file.size <= 5 * 1024 * 1024; // 5MB
    },
    {
      message: 'File size must be less than 5MB',
    },
  );
