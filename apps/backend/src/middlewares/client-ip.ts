/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { type RequestHandler } from 'express';

/**
 * Makes the client IP visible to Better Auth, which needs it for rate limiting.
 *
 * Better Auth reads the client IP from request headers only — `x-forwarded-for`
 * by default — and in production it gives up and returns `null` when no such
 * header is present. Returning `null` disables rate limiting for that request.
 * A container with a published port has no proxy in front of it setting that
 * header, so login rate limiting silently does nothing: nothing throttles
 * repeated password guesses.
 *
 * The correct value depends on the deployment, which is what `TRUST_PROXY`
 * selects:
 *
 * - **Not set (default)** — assume the app is reachable directly. Any
 *   `X-Forwarded-For` sent by a client is therefore forged, and is overwritten
 *   with the real peer address. Without this, an attacker could rotate the
 *   header to get a fresh rate-limit bucket per request.
 * - **Set** — assume a reverse proxy in front, and preserve the header it sets.
 *   Express is configured to trust the same number of hops, so `req.ip` agrees.
 */
export const clientIp: RequestHandler = (req, _res, next) => {
  // `req.ip` is resolved by Express from the `trust proxy` setting: the socket
  // peer when unset, or the right-most address in the X-Forwarded-For chain
  // that is not one of the configured trusted hops. Either way it is a value
  // the deployment vouches for.
  //
  // The header is then *overwritten* with it, never passed through. Better Auth
  // reads the left-most entry of X-Forwarded-For, so forwarding a raw
  // client-supplied header would let anyone prepend an address and get a fresh
  // rate-limit bucket on every request — defeating the limit entirely. This
  // holds even behind a proxy, because proxies typically append to the chain
  // rather than replacing it, leaving the forged entry on the left.
  //
  // Node reports IPv4 peers as IPv4-mapped IPv6 (`::ffff:10.0.0.1`) on a
  // dual-stack socket; Better Auth wants the plain form.
  const ip = req.ip?.replace(/^::ffff:/, '');

  if (ip) {
    req.headers['x-forwarded-for'] = ip;
  } else {
    delete req.headers['x-forwarded-for'];
  }

  next();
};
