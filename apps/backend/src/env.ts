/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import 'dotenv/config';
import z from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DB_FILE_NAME: z.string().default('file:storage/local.db'),
  /**
   * Set only when a reverse proxy sits in front of the app. Accepts Express's
   * `trust proxy` values: `true`, a hop count (`1`), or a comma-separated list
   * of trusted addresses/subnets. Leave unset when the app is reached directly —
   * trusting `X-Forwarded-For` from arbitrary clients lets them forge their IP
   * and evade rate limiting.
   */
  TRUST_PROXY: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z
      .string()
      .optional()
      .transform((val) => {
        if (val === undefined || val === 'false') return false;
        if (val === 'true') return true;
        return /^\d+$/.test(val) ? Number(val) : val;
      }),
  ),
  /** Public origin of the auth API (same as the web app when using the Nginx proxy). Overrides first CLIENT_URL for Better Auth `baseURL`. */
  BETTER_AUTH_URL: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z.string().url().optional(),
  ),
  CLIENT_URL: z
    .string()
    .default('http://localhost:5173')
    .transform((s) =>
      s
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.url())),
});

export const env = envSchema.parse(process.env);
