/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import axios from 'axios';
import { client } from '@repo/sdk/client.ts';

const url = process.env.WORDYME_URL?.replace(/\/$/, '');
const email = process.env.WORDYME_EMAIL;
const password = process.env.WORDYME_PASSWORD;

export function assertConfig(): void {
  const missing = [
    !url && 'WORDYME_URL',
    !email && 'WORDYME_EMAIL',
    !password && 'WORDYME_PASSWORD',
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

let loginPromise: Promise<void> | null = null;

async function login(): Promise<void> {
  // Plain Node HTTP on purpose: the global fetch adds Sec-Fetch-* headers, which
  // make Better Auth treat the call as a browser submission and demand an Origin.
  const response = await axios.post<{ message?: string }>(
    `${url}/api/auth/sign-in/email`,
    { email, password },
    { adapter: 'http', validateStatus: () => true },
  );
  if (response.status !== 200) {
    const detail = response.data?.message ? `: ${response.data.message}` : '';
    throw new Error(
      `WordyMe sign-in failed (HTTP ${response.status}${detail}) — check WORDYME_EMAIL and WORDYME_PASSWORD`,
    );
  }
  // Provided by the backend's Better Auth bearer() plugin.
  const token = response.headers['set-auth-token'];
  if (typeof token !== 'string' || !token) {
    throw new Error('WordyMe sign-in returned no set-auth-token header');
  }
  client.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export function ensureAuth(): Promise<void> {
  loginPromise ??= login().catch((error: unknown) => {
    loginPromise = null;
    throw error;
  });
  return loginPromise;
}

export function configureClient(): void {
  client.defaults.baseURL = `${url}/api`;
  client.defaults.adapter = 'http';
  client.interceptors.response.use(undefined, async (error) => {
    const config = error?.config;
    if (error?.response?.status === 401 && config && !config.__retriedAfterLogin) {
      config.__retriedAfterLogin = true;
      loginPromise = null;
      await ensureAuth();
      config.headers = {
        ...config.headers,
        Authorization: client.defaults.headers.common.Authorization,
      };
      return client.request(config);
    }
    throw error;
  });
}
