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
   * Set only when a reverse proxy sits in front of the app. Accepts a hop count
   * (`1`) or a comma-separated list of trusted addresses/subnets
   * (`10.0.0.0/8`). Leave unset when the app is reached directly.
   *
   * `true` is deliberately rejected. It makes Express take the left-most
   * `X-Forwarded-For` entry, which any client can prepend — so a value meant to
   * identify the caller becomes attacker-controlled.
   */
  TRUST_PROXY: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z
      .string()
      .optional()
      .refine((val) => val !== 'true', {
        message:
          'TRUST_PROXY=true is unsafe: Express would trust the left-most X-Forwarded-For entry, which any client can forge. Use a hop count (e.g. TRUST_PROXY=1) or a list of trusted proxy addresses/subnets instead.',
      })
      .transform((val) => {
        if (val === undefined || val === 'false') return false;
        return /^\d+$/.test(val) ? Number(val) : val;
      }),
  ),
  /**
   * Accept a request whose `Origin` matches the host it arrived on, so the app
   * works at whatever address users reach it by — a LAN IP, a hostname, a
   * Tailscale address, a public domain — without naming each one up front.
   *
   * On by default because a container cannot know the address users type, and
   * the alternative is a 403 at sign-up that reads as a broken app. CSRF
   * protection is unaffected: a browser always sets `Host` to the server it is
   * talking to, so a cross-site request still fails the origin match.
   *
   * Set `false` to trust only the origins named in `CLIENT_URL`.
   */
  TRUST_HOST: z.preprocess(
    (val) => {
      if (typeof val !== 'string') return val;
      const normalised = val.trim().toLowerCase();
      if (normalised === '') return undefined;
      if (['true', '1', 'yes', 'on'].includes(normalised)) return true;
      if (['false', '0', 'no', 'off'].includes(normalised)) return false;
      return val;
    },
    z.boolean({ error: 'TRUST_HOST must be true or false.' }).default(true),
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
