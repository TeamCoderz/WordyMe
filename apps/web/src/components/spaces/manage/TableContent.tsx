import * as React from 'react';
import { toast } from 'sonner';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { AssistiveTreeDescription, useTree } from '@headless-tree/react';
import {
  dragAndDropFeature,
  hotkeysCoreFeature,
  keyboardDragAndDropFeature,
  selectionFeature,
  syncDataLoaderFeature,
} from '@headless-tree/core';
import { Tree, TreeDragLine } from '@repo/ui/components/tree';
import { ManageSpacesTableRow } from './TableRow';
import { arrayToTree } from '@repo/lib/data/tree';
import { generatePositionKeysBetween } from '@repo/lib/utils/position';
import { getAllSpacesQueryOptions, ListSpaceResult } from '@/queries/spaces';
import { updateSpace } from '@repo/backend/sdk/spaces.js';

export type ManageSpacesTableContentHandle = {
  beginRootInlineCreate: (type: 'space' | 'folder') => void;
  expandItem: (itemId: string) => void;
};

export const ManageSpacesTableContent = React.forwardRef<
  ManageSpacesTableContentHandle,
  {
    rootSpaceId?: string;
    spaces?: ListSpaceResult;
    onInsertPlaceholder?: (params: {
      parentId: string | null;
      type: 'space' | 'folder';
      name?: string;
    }) => void;
    onRemovePlaceholder?: () => void;
    placeholderClientId?: string;
  }
>(function ManageSpacesTableContent(
  {
    rootSpaceId,
    spaces: spacesFromProps,
    onInsertPlaceholder,
    onRemovePlaceholder,
    placeholderClientId,
  },
  ref,
) {
  const queryClient = useQueryClient();
  const { data: spacesFromQuery } = useSuspenseQuery(getAllSpacesQueryOptions);

  // Use spaces from props if provided, otherwise fall back to query
  const spaces = spacesFromProps || spacesFromQuery;
  const [draggingId, setDraggingId] = React.useState<string | null>(null);

  const insertPlaceholderHandler = React.useCallback(
    (params: { parentId: string | null; type: 'space' | 'folder'; name?: string }) => {
      onInsertPlaceholder?.(params);
    },
    [onInsertPlaceholder],
  );

  const spacesTree = React.useMemo(() => {
    const filteredSpaces = spaces.filter((s) => !(s.from === 'sidebar' && s.id === 'new-space'));
    if (!rootSpaceId) return arrayToTree(filteredSpaces);
    // Build a subtree starting from rootSpaceId
    const byId = new Map(filteredSpaces.map((s) => [s.id, s] as const));
    const root = byId.get(rootSpaceId);
    if (!root) return arrayToTree(filteredSpaces);
    const descendants: typeof filteredSpaces = [];
    const stack = [root];
    while (stack.length) {
      const current = stack.pop()!;
      descendants.push(current);
      for (const s of filteredSpaces) {
        if (s.parentId === current.id) stack.push(s);
      }
    }
    // When scoping to a nested container, treat that container as a top-level node
    // by normalizing its parentId to null so it becomes a root of the scoped tree.
    const normalized = descendants.map((s) => (s.id === root.id ? { ...s, parentId: null } : s));
    return arrayToTree(normalized);
  }, [spaces, rootSpaceId]);

  const tree = useTree<any | null>({
    initialState: {
      expandedItems: [],
      selectedItems: [],
    },
    indent: 4,
    rootItemId: 'root',
    getItemName: (item) => item.getItemData()?.data.name ?? '',
    isItemFolder: (item) => {
      try {
        const data = item.getItemData();
        const hasChildren = Array.isArray(data?.children) && data.children.length > 0;
        const isContainer = (data?.data as any)?.isContainer === true;
        return isContainer || hasChildren;
      } catch {
        return false;
      }
    },
    canReorder: true,
    canDrop: (_items, target) => {
      try {
        if (!target || !target.item) return true;
        // If we're scoped to a particular rootSpaceId, disallow dropping directly under the tree root
        // which corresponds to the same level as the scoped parent's level in the full tree.
        if (rootSpaceId) {
          const targetId =
            typeof target.item.getId === 'function' ? target.item.getId() : undefined;
          if (targetId === 'root') return false;
        }
        // Disallow dropping inside non-container spaces (except implicit root handling above)
        const parentItem = target.item.getItemData?.();
        const parentData = parentItem?.data ?? parentItem;
        const isContainer =
          parentData?.isContainer === true ||
          (Array.isArray(parentItem?.children) && parentItem.children.length > 0);
        if (parentItem && parentItem.id !== 'root' && !isContainer) {
          return false;
        }
        return true;
      } catch (e) {
        return true;
      }
    },
    onDrop: async (items, target) => {
      const parentItem = target.item.getItemData();
      // Guard again at runtime: prevent drop into non-container spaces
      try {
        const parentData = parentItem?.data ?? parentItem;
        const isContainer =
          parentData?.isContainer === true ||
          (Array.isArray(parentItem?.children) && parentItem.children.length > 0);
        if (parentItem && parentItem.id !== 'root' && !isContainer) {
          return;
        }
      } catch {
        // no-op
      }
      const parentId = parentItem?.id === 'root' ? null : parentItem?.id;
      // If we're scoped to a particular rootSpaceId, prevent dropping directly under the tree root
      // which represents the parent's level outside of the scoped subtree.
      if (rootSpaceId && parentItem?.id === 'root') {
        return;
      }
      const children = parentItem?.children ?? [];
      const childIndex = (target as any).childIndex ?? children.length;

      const prevKey = children[childIndex - 1]?.data.position;
      const nextKey = children[childIndex]?.data.position;
      const positionKeys = generatePositionKeysBetween(prevKey, nextKey, items.length);
      for (const [index, item] of items.entries()) {
        const child = item.getItemData()?.data;
        if (!child) continue;
        const newPosition = positionKeys[index];
        if (child.parentId !== parentId || child.position !== newPosition) {
          const loadingToast = toast.loading('Updating space position...');
          try {
            queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
              return old?.map((s) => {
                if (s.id === child.id) {
                  return { ...s, parentId, position: newPosition };
                }
                return s;
              });
            });
            tree.rebuildTree();

            const { data, error } = await updateSpace(child.id, {
              parent_id: parentId,
              position: newPosition,
            });
            if (error) throw error;
            queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
              return old?.map((s) => {
                if (s.id === child.id) {
                  return data;
                }
                return s;
              });
            });
            toast.success('Space position updated successfully', {
              id: loadingToast,
            });
            tree.rebuildTree();
          } catch (error) {
            toast.error('Failed to update space position', {
              id: loadingToast,
            });
            queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
              return old?.map((s) => {
                if (s.id === child.id) {
                  return { ...s, parentId, position: child.position };
                }
                return s;
              });
            });
            tree.rebuildTree();
          }
        }
      }
      tree.setSelectedItems([]);
      tree.rebuildTree();
    },
    dataLoader: {
      getItem: (itemId) => {
        try {
          const node = spacesTree.findNodeById(itemId);
          if (!node) {
            console.warn(`Item not found: ${itemId}`);
            return null;
          }
          return node;
        } catch (error) {
          console.error(`Error getting item ${itemId}:`, error);
          return null;
        }
      },
      getChildren: (itemId) => {
        try {
          const node = spacesTree.findNodeById(itemId);
          if (!node) {
            console.warn(`Parent not found: ${itemId}`);
            return [];
          }
          return (
            node.children
              ?.filter((child: any) => child.id !== 'new')
              ?.map((child: any) => child.id) ?? []
          );
        } catch (error) {
          console.error(`Error getting children for ${itemId}:`, error);
          return [];
        }
      },
    },
    features: [
      syncDataLoaderFeature,
      selectionFeature,
      hotkeysCoreFeature,
      dragAndDropFeature,
      keyboardDragAndDropFeature,
    ],
  });

  React.useImperativeHandle(
    ref,
    () => ({
      beginRootInlineCreate: (type: 'space' | 'folder') => {
        insertPlaceholderHandler({
          parentId: rootSpaceId ? rootSpaceId : 'root',
          type,
        });
      },
      expandItem: (itemId: string) => {
        try {
          const items = tree.getItems();
          const item = items.find((it) => typeof it.getId === 'function' && it.getId() === itemId);
          if (item) {
            if (typeof (item as any).setExpanded === 'function') {
              (item as any).setExpanded(true);
            } else if (typeof (item as any).expand === 'function') {
              (item as any).expand();
            }
          }
        } catch (error) {
          // Item might not be in tree or not expandable
          console.warn('Could not expand item:', itemId, error);
        }
      },
    }),
    [rootSpaceId, insertPlaceholderHandler, tree],
  );

  React.useEffect(() => {
    tree.rebuildTree();
  }, [spacesTree]);

  const getDescendantIds = React.useCallback(
    (nodeId: string): string[] => {
      const ids: string[] = [];
      const node = spacesTree.findNodeById(nodeId);
      if (!node) return ids;
      const walk = (n: any) => {
        const children = n.children ?? [];
        for (const child of children) {
          if (!child?.id) continue;
          ids.push(child.id);
          if (child.children?.length) walk(child);
        }
      };
      walk(node);
      return ids;
    },
    [spacesTree],
  );

  const itemsToRender = tree.getItems().filter((item) => item.getId() !== 'root');

  return (
    <div className="min-w-fit w-full select-none">
      <div className="grid grid-cols-[minmax(16rem,2fr)_minmax(8rem,1fr)_minmax(10rem,1fr)_minmax(10rem,1fr)_auto] gap-4 border-b border-dashed hover:bg-accent/50 data-[state=selected]:bg-accent transition-colors">
        <div className="text-muted-foreground uppercase text-sm h-10 px-2 text-left align-middle font-medium whitespace-nowrap flex items-center">
          Space Name
        </div>
        <div className="text-muted-foreground uppercase text-sm h-10 px-2 text-left align-middle font-medium whitespace-nowrap flex items-center">
          Space type
        </div>
        <div className="text-muted-foreground uppercase text-sm h-10 px-2 text-left align-middle font-medium whitespace-nowrap flex items-center">
          Created On
        </div>
        <div className="text-muted-foreground uppercase text-sm h-10 px-2 text-left align-middle font-medium whitespace-nowrap flex items-center">
          Last Modified
        </div>
        <div className="w-14"></div>
      </div>

      <Tree indent={16} tree={tree} onDragEnd={() => setDraggingId(null)}>
        <AssistiveTreeDescription tree={tree} />
        {itemsToRender.map((item, index) => {
          try {
            const itemData = item?.getItemData?.();
            if (!itemData) {
              console.warn(`Item data not found for: ${item.getId()}`);
              return null;
            }
            const nodeId = item.getId();
            return (
              <ManageSpacesTableRow
                key={item.getId()}
                item={item}
                index={index}
                isLast={index === itemsToRender.length - 1}
                draggingId={draggingId}
                setDraggingId={setDraggingId}
                tree={tree}
                getDescendantIds={getDescendantIds}
                onBeginInlineCreate={(type) =>
                  insertPlaceholderHandler({
                    parentId: nodeId,
                    type,
                  })
                }
                onRemovePlaceholder={onRemovePlaceholder}
                placeholderClientId={placeholderClientId}
              />
            );
          } catch (error) {
            console.error(`Error rendering item ${item.getId()}:`, error);
            return null;
          }
        })}
        <TreeDragLine />
      </Tree>
    </div>
  );
});
