/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { RequestHandler } from 'express';
import { env } from '../env.js';

/**
 * Makes a request-derived value safe to put in a log line. These values are
 * attacker-controlled: embedded newlines would let a client forge entire log
 * entries, and ANSI escape bytes can restyle or hide text in the terminal of
 * whoever runs `docker logs`. Control characters become spaces rather than
 * being dropped so the length of what was sent stays visible, and anything
 * absurdly long is cut — no legitimate Origin or path is 300 characters.
 */
const sanitizeForLog = (value: string): string => {
  // eslint-disable-next-line no-control-regex
  const cleaned = value.replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ');
  return cleaned.length > 300 ? `${cleaned.slice(0, 300)}…` : cleaned;
};

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
          `  ⚠  403 on ${req.method} ${sanitizeForLog(req.originalUrl)} from Origin: ${sanitizeForLog(origin)}`,
          '',
          `     Host header   ${sanitizeForLog(req.headers.host ?? '(none)')}`,
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
