/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { LatestRelease } from '@repo/backend/updates.js';
import { get, post } from './client.js';

export const getLatestRelease = async () => {
  return await get<LatestRelease>('/updates/latest');
};

export const checkForUpdates = async () => {
  return await post<LatestRelease>('/updates/check');
};
