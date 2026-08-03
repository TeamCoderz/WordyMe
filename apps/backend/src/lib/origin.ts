/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Works out which origins Better Auth should trust, and whether session cookies
 * should carry the `Secure` flag.
 *
 * The problem this solves: a container cannot know the address users type. It
 * sees `0.0.0.0:8080`, while the browser might be at `http://192.168.1.50:8080`,
 * `https://notes.example.com`, or a Tailscale address. Better Auth rejects any
 * request whose `Origin` is not trusted, so a mismatch surfaces as a 403 at
 * sign-up — which reads as a broken app rather than a configuration problem.
 */

import { existsSync } from 'node:fs';

/**
 * Resolves the origins to trust for one request.
 *
 * Deliberately NOT Better Auth's dynamic `baseURL` with `allowedHosts: ['*']`.
 * That expands to the literal entries `https://*` and `http://*` in the trusted
 * list, which match every origin — including an attacker's — and so disables
 * CSRF protection entirely rather than binding trust to the request's own host.
 */
export type TrustedOriginResolver = (request?: Request) => string[];

export type OriginConfig = {
  baseURL: string;
  trustedOrigins: string[] | TrustedOriginResolver;
  /**
   * Set explicitly rather than left to Better Auth, which infers it from the
   * scheme of `baseURL`. That inference reads whichever origin happens to be
   * first in `CLIENT_URL`, so a list like
   * `http://localhost:8080,https://notes.example.com` would strip `Secure` from
   * cookies served over HTTPS. Deciding it here from the operator's declared
   * public address keeps the two from disagreeing.
   */
  useSecureCookies: boolean;
  /**
   * Whether `X-Forwarded-Host` / `X-Forwarded-Proto` may be believed. Better
   * Auth defaults this to `true`, which trusts headers any client can send when
   * no proxy is present. Tied to `TRUST_PROXY` so the two cannot disagree.
   */
  trustedProxyHeaders: boolean;
  warnings: string[];
};

const isHttps = (origin: string): boolean => origin.startsWith('https://');

const hostOf = (origin: string): string | null => {
  try {
    return new URL(origin).hostname;
  } catch {
    return null;
  }
};

const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0']);

const isLoopback = (origin: string): boolean => {
  const host = hostOf(origin);
  return host !== null && LOOPBACK.has(host);
};

/**
 * True when the process is running inside a container.
 *
 * Detected by the marker files the runtimes create rather than an environment
 * variable: Docker sets no variable of its own, and anything we set ourselves
 * would be absent when the image is run by something other than our compose
 * files.
 */
export const inContainer = (): boolean =>
  existsSync('/.dockerenv') || existsSync('/run/.containerenv');

export const resolveOriginConfig = ({
  clientUrls,
  betterAuthUrl,
  trustHost,
  behindProxy,
  containerised = inContainer(),
}: {
  clientUrls: string[];
  betterAuthUrl?: string;
  trustHost: boolean;
  behindProxy: boolean;
  containerised?: boolean;
}): OriginConfig => {
  const warnings: string[] = [];

  // Whether TLS is in play is something only the operator knows. Behind a proxy
  // the container is spoken to over plain HTTP even when users are on HTTPS, so
  // it cannot be detected from the socket. `BETTER_AUTH_URL` wins when set,
  // because it names the canonical public address.
  const declaredHttps = betterAuthUrl ? isHttps(betterAuthUrl) : clientUrls.some(isHttps);

  const baseURL = betterAuthUrl ?? clientUrls[0];

  /**
   * Accepts an `Origin` whose host equals the host the request arrived on.
   *
   * This is what keeps CSRF protection intact. A browser always sets `Host` to
   * the server it is actually talking to, so a cross-site request from evil.com
   * arrives as `Origin: https://evil.com` with `Host: notes.example.com` — the
   * hosts differ, and it is refused. An attacker cannot make a victim's browser
   * send a forged `Host` without already controlling DNS for that name.
   *
   * Both schemes are allowed for the matched host. Behind a TLS-terminating
   * proxy the container is spoken to over plain HTTP while the browser reports
   * an `https://` origin, and requiring the schemes to agree would reject every
   * such deployment that had not also set `TRUST_PROXY`. Accepting both adds no
   * real exposure: reaching the same host over the other scheme already means
   * controlling that host.
   */
  const trustRequestHost: TrustedOriginResolver = (request) => {
    // Better Auth may resolve trusted origins outside a request. With no host to
    // bind to, fall back to the explicit list rather than trusting anything.
    if (!request) return clientUrls;

    const forwarded = behindProxy ? request.headers.get('x-forwarded-host') : null;
    const host = forwarded?.split(',')[0]?.trim() || request.headers.get('host');

    if (!host) return clientUrls;

    return [...clientUrls, `https://${host}`, `http://${host}`];
  };

  if (behindProxy && !declaredHttps) {
    warnings.push(
      [
        '',
        '  ⚠  TRUST_PROXY is set but no HTTPS address is configured.',
        '',
        '     Session cookies will be sent without the Secure flag, so a browser',
        '     will also send them over plain HTTP. A reverse proxy almost always',
        '     means users reach this app over HTTPS.',
        '',
        '     Fix: set BETTER_AUTH_URL to the address users type, then restart.',
        '       BETTER_AUTH_URL=https://notes.example.com',
        '',
        '     Safe to ignore only if the proxy really does serve plain HTTP.',
        '',
      ].join('\n'),
    );
  }

  const mixed = clientUrls.some(isHttps) && clientUrls.some((u) => !isHttps(u));

  if (mixed && !betterAuthUrl) {
    warnings.push(
      [
        '',
        '  ⚠  CLIENT_URL mixes http:// and https:// origins.',
        '',
        `     CLIENT_URL   ${clientUrls.join(', ')}`,
        '',
        '     Cookies carry one Secure setting for all of them, so one scheme will',
        '     always be wrong: Secure cookies are dropped on http, and omitting',
        '     Secure exposes the session over http.',
        '',
        '     Fix: set BETTER_AUTH_URL to the canonical address users type.',
        '',
      ].join('\n'),
    );
  }

  if (!trustHost && containerised && clientUrls.every(isLoopback)) {
    warnings.push(
      [
        '',
        '  ⚠  TRUST_HOST is off and CLIENT_URL only names loopback addresses.',
        '',
        `     CLIENT_URL   ${clientUrls.join(', ')}`,
        '',
        '     Inside a container, "localhost" is the container itself — not how',
        '     anyone reaches this app. Every browser on another machine will be',
        '     refused at sign-in with "403 Invalid origin", while pages and health',
        '     checks keep working, so it reads as a rejected password.',
        '',
        '     Fix: set CLIENT_URL to the address users type, or leave TRUST_HOST',
        '     on and let the app accept whichever host the request arrived on.',
        '',
      ].join('\n'),
    );
  }

  return {
    baseURL,
    // Additive: the request's own host is trusted on top of these, so an
    // explicit CLIENT_URL keeps working exactly as before.
    trustedOrigins: trustHost ? trustRequestHost : clientUrls,
    useSecureCookies: declaredHttps,
    trustedProxyHeaders: behindProxy,
    warnings,
  };
};
