/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

const originPort = (origin: string): number | null => {
  try {
    const { port, protocol } = new URL(origin);

    if (port) return Number(port);
    if (protocol === 'https:') return 443;
    if (protocol === 'http:') return 80;

    return null;
  } catch {
    return null;
  }
};

export const clientUrlWarning = ({
  clientUrls,
  port,
  servesWebBundle,
  behindProxy,
}: {
  clientUrls: string[];
  port: number;
  servesWebBundle: boolean;
  behindProxy: boolean;
}): string | null => {
  if (!servesWebBundle || behindProxy) return null;
  if (clientUrls.some((origin) => originPort(origin) === port)) return null;

  return [
    '',
    '  ⚠  CLIENT_URL does not name the port this server listens on.',
    '',
    `     listening on   http://localhost:${port}`,
    `     CLIENT_URL     ${clientUrls.join(', ')}`,
    '',
    '     If users reach this server at the address above, sign-in will fail with',
    '     "403 Invalid origin": Better Auth trusts only the origins in CLIENT_URL.',
    '     Pages and health checks keep working regardless, so the symptom reads as',
    '     a rejected password rather than a configuration problem.',
    '',
    '     Fix: set CLIENT_URL to the URL you open in the browser, then restart.',
    '',
    '     Expected, and safe to ignore, when the container is published on a',
    '     different host port — CLIENT_URL should name the address users type,',
    '     which this process cannot see. Behind a reverse proxy, set TRUST_PROXY;',
    '     that silences this check.',
    '',
  ].join('\n');
};
