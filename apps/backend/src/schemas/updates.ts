/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export type LatestRelease = {
  enabled: boolean;
  version: string | null;
  releaseUrl: string | null;
  publishedAt: string | null;
  checkedAt: string | null;
};
