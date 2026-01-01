import * as React from 'react';
import { toast } from 'sonner';
import { useQueryClient, useSuspenseQuery, UseSuspenseQueryOptions } from '@tanstack/react-query';
import { AssistiveTreeDescription, useTree } from '@headless-tree/react';
import {
  dragAndDropFeature,
  hotkeysCoreFeature,
  keyboardDragAndDropFeature,
  selectionFeature,
  syncDataLoaderFeature,
} from '@headless-tree/core';
import { Tree, TreeDragLine } from '@repo/ui/components/tree';
import { ManageDocumentsTableRow } from './TableRow';
import { arrayToTree, TreeNode } from '@repo/lib/data/tree';
import { generatePositionKeysBetween } from '@repo/lib/utils/position';
import {
  getAllDocumentsQueryOptions,
  ListDocumentResult,
  ListDocumentResultItem,
} from '@/queries/documents';
import { updateDocument } from '@repo/sdk/documents.ts';
import { useSelector } from '@/store';
// no-op
// Create mutations not used directly here; placeholder rows handle submit

export type ManageDocumentsTableContentHandle = {
  beginRootInlineCreate: (type: 'note' | 'folder') => void;
  expandItem: (itemId: string) => void;
};

export const ManageDocumentsTableContent = React.forwardRef<
  ManageDocumentsTableContentHandle,
  {
    rootDocumentId?: string;
    documents?: ListDocumentResult;
    onInsertPlaceholder?: (params: {
      parentId: string | null;
      type: 'note' | 'folder';
      name?: string;
    }) => void;
    onRemovePlaceholder?: () => void;
    placeholderClientId?: string;
  }
>(function ManageDocumentsTableContent(
  {
    rootDocumentId,
    documents: documentsFromProps,
    onInsertPlaceholder,
    onRemovePlaceholder,
    placeholderClientId,
  },
  ref,
) {
  const queryClient = useQueryClient();
  const spaceID = useSelector((state: any) => state.activeSpace?.id);
  const queryOptions = React.useMemo(() => {
    const options = getAllDocumentsQueryOptions(spaceID!);
    delete options.enabled;
    return options as UseSuspenseQueryOptions<ListDocumentResult>;
  }, [spaceID]);
  const { data: documentsFromQuery } = useSuspenseQuery(queryOptions);

  // Use documents from props if provided, otherwise fall back to query
  const documents = documentsFromProps || documentsFromQuery;
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  // Inline create rows are no longer used in Manage; we insert placeholders instead
  type DocumentTreeNode = TreeNode<ListDocumentResultItem>;
  const documentsTree = React.useMemo<DocumentTreeNode>(() => {
    const filtered = documents.filter((d) => !(d.from === 'sidebar' && d.id === 'new-doc'));

    if (!rootDocumentId) return arrayToTree(filtered);
    const byId = new Map(filtered.map((d) => [d.id, d] as const));
    const root = byId.get(rootDocumentId);
    if (!root) return arrayToTree(filtered);
    const descendants: typeof filtered = [];
    const stack = [root];
    while (stack.length) {
      const current = stack.pop()!;
      descendants.push(current);
      for (const s of filtered) {
        if (s.parentId === current.id) stack.push(s);
      }
    }
    // When scoping to a nested container, treat that container as a top-level node
    // by normalizing its parentId to null so it becomes a root of the scoped tree.
    const normalized = descendants.map((d) => (d.id === root.id ? { ...d, parentId: null } : d));
    return arrayToTree(normalized);
  }, [documents, rootDocumentId]);

  const insertPlaceholderHandler = React.useCallback(
    (params: { parentId: string | null; type: 'note' | 'folder'; name?: string }) => {
      onInsertPlaceholder?.(params);
    },
    [onInsertPlaceholder],
  );

  const tree = useTree<DocumentTreeNode | null>({
    initialState: {
      expandedItems: [],
      selectedItems: [],
    },
    indent: 4,
    rootItemId: 'root',
    getItemName: (item) => {
      const itemData = item.getItemData();
      return itemData?.data?.name ?? '';
    },
    isItemFolder: (item) => {
      try {
        const data = item.getItemData();
        if (!data) return false;
        const hasChildren = Array.isArray(data.children) && data.children.length > 0;
        const isContainer = data.data?.isContainer === true;
        return isContainer || hasChildren;
      } catch {
        return false;
      }
    },
    canReorder: true,
    canDrop: (_items, target) => {
      try {
        if (!target || !target.item) return true;
        const targetId = typeof target.item.getId === 'function' ? target.item.getId() : undefined;
        if (rootDocumentId && targetId === 'root') return false;
        const parentItem = target.item.getItemData() as DocumentTreeNode | null;
        if (!parentItem) return true;
        const isContainer =
          parentItem.data?.isContainer === true ||
          (Array.isArray(parentItem.children) && parentItem.children.length > 0);
        // Disallow dropping inside non-container rows (except implicit root handling above)
        if (parentItem.id !== 'root' && !isContainer) {
          return false;
        }
        return true;
      } catch {
        return true;
      }
    },
    onDrop: async (items, target) => {
      const parentItem = target.item.getItemData() as DocumentTreeNode | null;
      if (!parentItem) return;
      const parentId = parentItem.id === 'root' ? null : parentItem.id;
      if (rootDocumentId && parentItem.id === 'root') {
        return;
      }
      const children = parentItem.children ?? [];
      const childIndex = (target as { childIndex?: number }).childIndex ?? children.length;

      const prevKey = children[childIndex - 1]?.data.position;
      const nextKey = children[childIndex]?.data.position;
      const positionKeys = generatePositionKeysBetween(prevKey, nextKey, items.length);
      for (const [index, item] of items.entries()) {
        const itemData = item.getItemData() as DocumentTreeNode | null;
        if (!itemData) continue;
        const child = itemData.data;
        if (!child) continue;
        const newPosition = positionKeys[index];
        if (child.parentId !== parentId || child.position !== newPosition) {
          const loadingToast = toast.loading('Updating document position...');
          try {
            queryClient.setQueryData(
              getAllDocumentsQueryOptions(spaceID!).queryKey,
              (old: ListDocumentResult) => {
                return old?.map((d) => {
                  if (d.id === child.id) {
                    return { ...d, parentId, position: newPosition };
                  }
                  return d;
                });
              },
            );
            tree.rebuildTree();

            const { data, error } = await updateDocument(child.id, {
              parentId: parentId,
              position: newPosition,
            });
            if (error) throw error;
            queryClient.setQueryData(
              getAllDocumentsQueryOptions(spaceID!).queryKey,
              (old: ListDocumentResult) => {
                return old?.map((d) => {
                  if (d.id === child.id) {
                    return data as ListDocumentResultItem;
                  }
                  return d;
                });
              },
            );
            toast.success('Document position updated successfully', {
              id: loadingToast,
            });
            tree.rebuildTree();
          } catch (error) {
            toast.error('Failed to update document position', {
              id: loadingToast,
            });
            queryClient.setQueryData(
              getAllDocumentsQueryOptions(spaceID!).queryKey,
              (old: ListDocumentResult) => {
                return old?.map((d) => {
                  if (d.id === child.id) {
                    return { ...d, parentId, position: child.position };
                  }
                  return d;
                });
              },
            );
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
          if (itemId === 'new') {
            return null;
          }
          const node = documentsTree?.findNodeById(itemId);
          if (!node) {
            return null;
          }
          return node;
        } catch (error) {
          return null;
        }
      },
      getChildren: (itemId) => {
        try {
          const node = documentsTree?.findNodeById(itemId);
          if (!node) {
            return [];
          }
          return (
            node.children
              ?.filter((c: DocumentTreeNode) => c.id !== 'new')
              ?.map((c: DocumentTreeNode) => c.id) ?? []
          );
        } catch (error) {
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

  React.useLayoutEffect(() => {
    tree.rebuildTree();
  }, [documentsTree]);

  React.useImperativeHandle(
    ref,
    () => ({
      beginRootInlineCreate: (type: 'note' | 'folder') => {
        insertPlaceholderHandler({
          parentId: rootDocumentId ? rootDocumentId : 'root',
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
    [rootDocumentId, insertPlaceholderHandler, tree],
  );

  // No inline parent expand required

  const getDescendantIds = React.useCallback(
    (nodeId: string): string[] => {
      const ids: string[] = [];
      const node = documentsTree?.findNodeById(nodeId);
      if (!node) return ids;
      const walk = (n: DocumentTreeNode) => {
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
    [documentsTree],
  );

  const itemsToRender = tree.getItems().filter((item) => item.getId() !== 'root');

  return (
    <div className="w-full min-w-fit select-none">
      <div className="grid grid-cols-[minmax(16rem,2fr)_minmax(8rem,1fr)_minmax(10rem,1fr)_minmax(10rem,1fr)_auto] gap-4 border-b border-dashed data-[state=selected]:bg-muted transition-colors hover:bg-accent/50">
        <div className="text-muted-foreground uppercase text-sm h-10 px-2 text-left align-middle font-medium whitespace-nowrap flex items-center">
          Document Name
        </div>
        <div className="text-muted-foreground uppercase text-sm h-10 px-2 text-left align-middle font-medium whitespace-nowrap flex items-center">
          Type
        </div>
        <div className="text-muted-foreground uppercase text-sm h-10 px-2 text-left align-middle font-medium whitespace-nowrap flex items-center">
          Created On
        </div>
        <div className="text-muted-foreground uppercase text-sm h-10 px-2 text-left align-middle font-medium whitespace-nowrap flex items-center">
          Last Modified
        </div>
        <div className="w-14"></div>
      </div>

      {itemsToRender.length === 0 ? (
        <div className="text-center text-muted-foreground py-16 hover:bg-accent/50">
          No documents yet.
        </div>
      ) : (
        <Tree indent={16} itemID="clientId" tree={tree} onDragEnd={() => setDraggingId(null)}>
          <AssistiveTreeDescription tree={tree} />
          {itemsToRender.map((item, index) => {
            try {
              const itemData = item.getItemData();
              if (!itemData) {
                return null;
              }
              const nodeId = item.getId();
              const fragmentKey = itemData.data?.clientId ?? item.getId();

              return (
                <React.Fragment key={fragmentKey}>
                  <ManageDocumentsTableRow
                    item={item}
                    index={index}
                    isLast={index === itemsToRender.length - 1}
                    draggingId={draggingId}
                    setDraggingId={setDraggingId}
                    tree={tree}
                    getDescendantIds={getDescendantIds}
                    spaceID={spaceID}
                    onBeginInlineCreate={(type) =>
                      insertPlaceholderHandler({ parentId: nodeId, type })
                    }
                    onRemovePlaceholder={onRemovePlaceholder}
                    placeholderClientId={placeholderClientId}
                  />
                </React.Fragment>
              );
            } catch (error) {
              return null;
            }
          })}
          <TreeDragLine />
        </Tree>
      )}
    </div>
  );
});
