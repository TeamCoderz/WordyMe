/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { env } from '../env.js';
import type { LatestRelease } from '../schemas/updates.js';

export type { LatestRelease };

type GithubRelease = {
  tag_name?: unknown;
  html_url?: unknown;
  published_at?: unknown;
};

const RELEASES_URL = 'https://api.github.com/repos/TeamCoderz/WordyMe/releases/latest';
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;
const MIN_REFRESH_INTERVAL_MS = 5 * 60_000;

let cached: LatestRelease | null = null;
let inFlight: Promise<LatestRelease> | null = null;
let timer: NodeJS.Timeout | null = null;
let lastFetchedAt = 0;
let initialTimer: NodeJS.Timeout | null = null;

const empty = (checkedAt: string | null): LatestRelease => ({
  enabled: env.UPDATE_CHECK,
  version: null,
  releaseUrl: null,
  publishedAt: null,
  checkedAt,
});

const asString = (value: unknown) => (typeof value === 'string' ? value : null);

const fetchLatestRelease = async (): Promise<LatestRelease> => {
  const controller = new AbortController();
  const abort = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const checkedAt = new Date().toISOString();

  try {
    const response = await fetch(RELEASES_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'WordyMe' },
    });

    if (!response.ok) return empty(checkedAt);

    const release = (await response.json()) as GithubRelease;
    const tag = asString(release.tag_name);
    if (!tag) return empty(checkedAt);

    return {
      enabled: true,
      version: tag.replace(/^v/, ''),
      releaseUrl: asString(release.html_url),
      publishedAt: asString(release.published_at),
      checkedAt,
    };
  } catch {
    return empty(checkedAt);
  } finally {
    clearTimeout(abort);
  }
};

export const getLatestRelease = (): LatestRelease =>
  env.UPDATE_CHECK ? (cached ?? empty(null)) : empty(null);

export const refreshLatestRelease = async (): Promise<LatestRelease> => {
  if (!env.UPDATE_CHECK) return empty(null);
  if (inFlight) return inFlight;
  if (cached && Date.now() - lastFetchedAt < MIN_REFRESH_INTERVAL_MS) return cached;

  inFlight = fetchLatestRelease()
    .then((release) => {
      lastFetchedAt = Date.now();
      // Keep the last good answer when a refresh fails. Overwriting it would
      // downgrade a known "1.2.5 is available" to "couldn't check" on a single
      // GitHub blip, and leave it that way until the next scheduled check —
      // worst when it matters most, which is a release someone should install.
      // A first check that fails still caches, so the empty answer is served
      // rather than refetched on every request.
      if (release.version || !cached?.version) cached = release;
      return cached ?? release;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
};

export const startUpdateChecks = () => {
  if (!env.UPDATE_CHECK || timer) return;

  initialTimer = setTimeout(() => void refreshLatestRelease(), 30_000);
  initialTimer.unref?.();

  timer = setInterval(() => void refreshLatestRelease(), CHECK_INTERVAL_MS);
  timer.unref?.();
};

export const stopUpdateChecks = () => {
  if (initialTimer) {
    clearTimeout(initialTimer);
    initialTimer = null;
  }
  if (!timer) return;
  clearInterval(timer);
  timer = null;
};
