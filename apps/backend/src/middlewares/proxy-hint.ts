/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { RequestHandler } from 'express';
import { env } from '../env.js';
import { originConfig } from '../lib/auth.js';

/**
 * One-time hint when a TLS-terminating proxy appears to be in front of the app
 * but the app has not been told about it.
 *
 * This is the default state of a Coolify or Dokploy install: the platform's
 * Traefik terminates HTTPS and forwards plain HTTP, and unless the operator
 * sets TRUST_PROXY and BETTER_AUTH_URL, everything works — but session cookies
 * are not marked Secure, and login rate limiting keys on the proxy's address
 * instead of the client's. Nothing fails, so nothing prompts the operator to
 * finish the job. The startup warnings cannot catch it either: at boot there is
 * no request to look at.
 *
 * The `X-Forwarded-Proto: https` header is used purely as a hint to log a
 * message. It is NOT trusted for any security decision — that stays gated on
 * TRUST_PROXY — so a client sending the header directly can trigger this log
 * line once, and nothing else.
 */
let hinted = false;

export const proxyHint: RequestHandler = (req, _res, next) => {
  if (!hinted && env.TRUST_PROXY === false) {
    const raw = req.headers['x-forwarded-proto'];
    const proto = (Array.isArray(raw) ? raw[0] : raw)?.split(',')[0]?.trim();

    if (proto === 'https') {
      hinted = true;

      console.warn(
        [
          '',
          '  ⚠  Requests carry X-Forwarded-Proto: https, but TRUST_PROXY is not set.',
          '',
          '     A reverse proxy (Traefik, Caddy, nginx — e.g. a Coolify or Dokploy',
          '     install) appears to terminate TLS in front of this app. The app works,',
          '     but two settings are missing:',
          '',
          '       TRUST_PROXY=1',
          '         Login rate limiting currently sees every user as the proxy',
          '         address, so all users share one bucket.',
          ...(originConfig.useSecureCookies
            ? []
            : [
                '',
                '       BETTER_AUTH_URL=https://your-domain',
                '         Session cookies are currently not marked Secure, so a',
                '         downgrade to plain HTTP would expose them.',
              ]),
          '',
          '     See "Serving over HTTPS" in DOCKER.md. This hint is logged once.',
          '',
        ].join('\n'),
      );
    }
  }

  next();
};
