/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing';

export interface PositionableItem {
  id: string;
  position?: string | null;
  parentId?: string | null;
}

/**
 * Generates a position key for a new item to be placed at the beginning of a list
 */
export function generateInitialPosition(): string {
  return generateKeyBetween(null, null);
}

/**
 * Generates a position key for placing an item between two existing items
 * @param beforePosition - Position key of the item before the new position
 * @param afterPosition - Position key of the item after the new position
 * @returns A new position key that falls between the two provided positions
 */
export function generatePositionKeyBetween(
  beforePosition: string | null | undefined,
  afterPosition: string | null | undefined,
): string {
  return generateKeyBetween(beforePosition || null, afterPosition || null);
}

/**
 * Sorts items by their position key
 * @param items - Array of items with position property
 * @returns Sorted array of items
 */
export function sortByPosition<T extends PositionableItem>(items: T[]): T[] {
  return items.sort((a, b) => {
    const posA = a.position || '';
    const posB = b.position || '';
    return posA < posB ? -1 : posA > posB ? 1 : 0;
  });
}

/**
 * Gets siblings of an item (items with the same parentId)
 * @param items - Array of all items
 * @param parentId - Parent ID to filter by
 * @returns Array of sibling items sorted by position
 */
export function getSiblings<T extends PositionableItem>(
  items: T[],
  parentId: string | null | undefined,
): T[] {
  const siblings = items.filter((item) => item.parentId === parentId);
  return sortByPosition(siblings);
}

/**
 * Generates a number of position keys between two position keys
 * @param startPosition - Position key to start from
 * @param endPosition - Position key to end at
 * @param count - Number of position keys to generate
 * @returns Array of position keys
 */
export function generatePositionKeysBetween(
  startPosition: string | null | undefined,
  endPosition: string | null | undefined,
  count: number,
): string[] {
  return generateNKeysBetween(startPosition, endPosition, count);
}
