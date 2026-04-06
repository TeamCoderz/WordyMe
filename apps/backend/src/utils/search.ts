/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export const tokenizeSearchQuery = (value: string): string[] => {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
};

export const buildPrefixMatchQuery = (tokens: string[]): string => {
  if (tokens.length === 0) return '';
  return tokens.map((token) => `${token}*`).join(' AND ');
};

const isEditDistanceAtMostOne = (source: string, target: string): boolean => {
  if (source === target) return true;
  if (Math.abs(source.length - target.length) > 1) return false;

  let i = 0;
  let j = 0;
  let edits = 0;

  while (i < source.length && j < target.length) {
    if (source[i] === target[j]) {
      i += 1;
      j += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) return false;

    if (source.length > target.length) {
      i += 1;
    } else if (source.length < target.length) {
      j += 1;
    } else {
      i += 1;
      j += 1;
    }
  }

  if (i < source.length || j < target.length) {
    edits += 1;
  }

  return edits <= 1;
};

export const buildTypoVariants = (
  query: string,
  vocabulary: string[],
  maxVariants = 20,
): string[] => {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0 || vocabulary.length === 0) return [];

  const variants = new Set<string>();

  for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex += 1) {
    const token = tokens[tokenIndex];

    for (const candidate of vocabulary) {
      if (!isEditDistanceAtMostOne(token, candidate)) continue;

      const next = [...tokens];
      next[tokenIndex] = candidate;
      variants.add(next.join(' '));

      if (variants.size >= maxVariants) {
        return [...variants];
      }
    }
  }

  return [...variants];
};
