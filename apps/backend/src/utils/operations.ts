/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

const CHILD_KEYS = ['children', 'spaceRootChildren'] as const;

const walkDocumentTree = (
  root: unknown,
  visit: (node: Record<string, unknown>, depth: number) => void,
) => {
  const stack: Array<{ node: unknown; depth: number }> = [{ node: root, depth: 1 }];

  while (stack.length > 0) {
    const { node, depth } = stack.pop()!;
    if (!node || typeof node !== 'object') continue;

    const record = node as Record<string, unknown>;
    visit(record, depth);

    for (const key of CHILD_KEYS) {
      const children = record[key];
      if (!Array.isArray(children)) continue;
      for (const child of children) stack.push({ node: child, depth: depth + 1 });
    }
  }
};

export const documentTreeDepth = (root: unknown): number => {
  let maxDepth = 0;

  walkDocumentTree(root, (_node, depth) => {
    if (depth > maxDepth) maxDepth = depth;
  });

  return maxDepth;
};

export const documentTreeNodeCount = (root: unknown): number => {
  let nodes = 0;

  walkDocumentTree(root, () => {
    nodes += 1;
  });

  return nodes;
};

export const normalizeDocumentTreeContent = (root: unknown) => {
  walkDocumentTree(root, (node) => {
    const revision = node.revision;
    if (!revision || typeof revision !== 'object') return;

    const record = revision as Record<string, unknown>;
    if (record.content !== null && typeof record.content === 'object') {
      record.content = JSON.stringify(record.content);
    }
  });
};
