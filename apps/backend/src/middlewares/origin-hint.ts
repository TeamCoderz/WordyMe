/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { RequestHandler } from 'express';
import { env } from '../env.js';

/**
 * Explains origin rejections in the server log.
 *
 * Better Auth answers an untrusted `Origin` with a bare `403 Invalid origin`.
 * The browser shows it as a failed sign-in, and the operator has no way to see
 * which origin was sent or which ones were trusted — the two facts needed to fix
 * it. Rather than guess, print both.
 *
 * Only fires on 403 responses that carried an `Origin`, so ordinary
 * authorisation failures stay quiet.
 */
export const originHint: RequestHandler = (req, res, next) => {
  const origin = req.headers.origin;

  if (origin) {
    res.on('finish', () => {
      if (res.statusCode !== 403) return;

      console.warn(
        [
          '',
          `  ⚠  403 on ${req.method} ${req.originalUrl} from Origin: ${origin}`,
          '',
          `     Host header   ${req.headers.host ?? '(none)'}`,
          `     CLIENT_URL    ${env.CLIENT_URL.join(', ')}`,
          `     TRUST_HOST    ${env.TRUST_HOST}`,
          '',
          env.TRUST_HOST
            ? [
                '     TRUST_HOST is on, so this Origin should have been accepted if it',
                '     matched the Host above. When they differ — a separately hosted',
                '     frontend, or a proxy rewriting Host — add the Origin to CLIENT_URL.',
              ].join('\n')
            : [
                '     TRUST_HOST is off, so only the origins in CLIENT_URL are accepted.',
                '     Add the Origin above to CLIENT_URL, or set TRUST_HOST=true to accept',
                '     whichever host the request arrived on.',
              ].join('\n'),
          '',
          '     If this was a permissions failure rather than an origin one, ignore this.',
          '',
        ].join('\n'),
      );
    });
  }

  next();
};
