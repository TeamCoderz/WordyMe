import { useQueryClient } from '@tanstack/react-query';

export function getDescendants<T extends { id: string; parentId?: string | null }>(
  items: T[],
  rootId: string,
): T[] {
  const descendants: T[] = [];
  if (!Array.isArray(items) || !rootId) return descendants;

  const childrenByParent = new Map<string | null, T[]>();
  for (const item of items) {
    const parentKey = (item.parentId ?? null) as string | null;
    const arr = childrenByParent.get(parentKey) ?? [];
    arr.push(item);
    childrenByParent.set(parentKey, arr);
  }

  const stack: T[] = [...(childrenByParent.get(rootId) ?? [])];
  while (stack.length > 0) {
    const current = stack.pop()!;
    descendants.push(current);
    const children = childrenByParent.get(current.id) ?? [];
    if (children.length > 0) {
      for (const child of children) {
        stack.push(child);
      }
    }
  }

  return descendants;
}

export function useAllQueriesInvalidate() {
  const queryClient = useQueryClient();
  const invalidate = (queryKeys: string[][]) => {
    for (const queryKey of queryKeys) {
      queryClient.invalidateQueries({
        queryKey: queryKey,
      });
    }
  };
  return invalidate;
}

export function removeWithDescendantsFromCache<T extends { id: string; parentId?: string | null }>(
  allItems: T[] | undefined,
  rootId: string,
): T[] | undefined {
  if (!allItems) return allItems;
  const toRemove = new Set<string>([rootId]);
  const childrenByParent = new Map<string | null, T[]>();
  for (const item of allItems) {
    const parentKey = (item.parentId ?? null) as string | null;
    const arr = childrenByParent.get(parentKey) ?? [];
    arr.push(item);
    childrenByParent.set(parentKey, arr);
  }
  const stack: string[] = [rootId];
  while (stack.length) {
    const current = stack.pop()!;
    const children = childrenByParent.get(current as any) ?? [];
    for (const child of children) {
      if (!toRemove.has(child.id)) {
        toRemove.add(child.id);
        stack.push(child.id);
      }
    }
  }
  return allItems.filter((item) => !toRemove.has(item.id));
}

export function useRemoveWithDescendantsFromCache() {
  const queryClient = useQueryClient();
  return function removeFromQuery<T extends { id: string; parentId?: string | null }>(
    queryKey: readonly unknown[],
    rootId: string,
  ) {
    queryClient.setQueryData(queryKey, (old: T[] | undefined) =>
      removeWithDescendantsFromCache(old, rootId),
    );
  };
}

export function filterValidHierarchy<T extends { id: string; parentId?: string | null }>(
  items: T[],
): T[] {
  if (!Array.isArray(items) || items.length === 0) return items;

  const itemIds = new Set(items.map((item) => item.id));
  const itemMap = new Map(items.map((item) => [item.id, item]));

  return items.filter((item) => {
    // Include root items (no parent or parent is null)
    if (!item.parentId) return true;

    // Check if entire parent chain is valid
    let currentParentId: string | null = item.parentId;
    while (currentParentId) {
      if (!itemIds.has(currentParentId)) {
        return false; // Missing parent in the chain
      }
      const parent = itemMap.get(currentParentId);
      currentParentId = parent?.parentId || null;
    }

    return true; // All parents in the chain exist
  });
}
