/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

const CHILD_KEYS = ['children', 'spaceRootChildren'] as const;

const asReadableContent = (content: string): unknown => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    return content;
  }

  return parsed !== null && typeof parsed === 'object' ? parsed : content;
};

export const expandDocumentTreeContent = (root: unknown) => {
  const stack: unknown[] = [root];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;

    const record = node as Record<string, unknown>;
    const revision = record.revision;

    if (revision && typeof revision === 'object') {
      const revisionRecord = revision as Record<string, unknown>;
      if (typeof revisionRecord.content === 'string') {
        revisionRecord.content = asReadableContent(revisionRecord.content);
      }
    }

    for (const key of CHILD_KEYS) {
      const children = record[key];
      if (!Array.isArray(children)) continue;
      for (const child of children) stack.push(child);
    }
  }

  return root;
};
