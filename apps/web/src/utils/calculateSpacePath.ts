/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { Space } from '@repo/types';

export function calculateSpacePath(spaceId: string, allSpaces: Space[]): Space[] {
  const path: Space[] = [];
  let currentSpaceId = spaceId;

  while (currentSpaceId) {
    const space = allSpaces.find((s) => s.id === currentSpaceId);
    if (!space) break;

    // Add parent spaces to the beginning of the path
    if (space.parentId) {
      const parentSpace = allSpaces.find((s) => s.id === space.parentId);
      if (parentSpace) {
        path.unshift(parentSpace);
      }
    }
    currentSpaceId = space.parentId || '';
  }

  return path;
}
