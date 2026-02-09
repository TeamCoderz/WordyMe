'use client';

import { DocumentItem } from './DocumentItem';
import { CreateDocumentSection } from './CreateDocumentSection';
import { useDocumentTree } from './useDocumentTree';
import { SidebarMenu, SidebarMenuSkeleton } from '@repo/ui/components/sidebar';
import { useActions, useSelector } from '@/store';
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllDocumentsQueryOptions, ListDocumentResult } from '@/queries/documents';
import { getSiblings, sortByPosition, generatePositionKeyBetween } from '@repo/lib/utils/position';

export function DocumentTree() {
  const activeSpace = useSelector((s) => s.activeSpace);
  const spaceId = activeSpace?.id ?? '';
  const { data: documentsData } = useQuery(getAllDocumentsQueryOptions(spaceId!));

  const [placeholder, setPlaceholder] = React.useState<ListDocumentResult[number] | null>(null);

  // Merge placeholder with documents data
  const documentsWithPlaceholder = React.useMemo(() => {
    if (!documentsData) return documentsData;
    if (!placeholder) return documentsData;
    return [...documentsData, placeholder];
  }, [documentsData, placeholder]);

  const {
    documentsTree,
    activeDocument,
    openMenuDocumentId,
    isExpanded,
    handleSelectDocument,
    toggleExpanded,
    setOpenMenuDocumentId,
    isLoading,
  } = useDocumentTree(documentsWithPlaceholder);

  const rootDocuments = documentsTree?.children ?? [];
  const inlineCreate = useSelector((s) => s.inlineCreate);
  const { clearInlineCreate } = useActions();

  const insertPlaceholder = React.useCallback(
    (params: { type: 'note' | 'folder'; name?: string; parentId: string | null }) => {
      if (!documentsData) return;

      const resolvedParentId = params.parentId === 'root' ? null : params.parentId;
      const siblings = getSiblings(documentsData, resolvedParentId);
      const sorted = sortByPosition(siblings);

      let position: string;
      if (sorted.length === 0) position = 'a0';
      else position = generatePositionKeyBetween(sorted.at(-1)?.position || 'a0', null);

      const clientId = crypto.randomUUID();
      const newPlaceholder: ListDocumentResult[number] = {
        id: 'new-doc',
        clientId: clientId as any,
        name: params.name?.trim() || (params.type === 'folder' ? 'New Folder' : 'New Document'),
        handle: 'new-doc',
        icon: params.type === 'folder' ? ('folder' as any) : ('file' as any),
        position,
        parentId: resolvedParentId,
        spaceId,
        createdAt: new Date(),
        isFavorite: false,
        isContainer: params.type === 'folder',
        updatedAt: new Date(),
        lastViewedAt: null,
        documentType: params.type === 'folder' ? ('folder' as any) : ('note' as any),
        from: 'sidebar',
        currentRevisionId: null,
        userId: '',
      };

      setPlaceholder(newPlaceholder);
    },
    [documentsData, spaceId],
  );

  const removePlaceholder = React.useCallback(() => {
    setPlaceholder(null);
  }, []);

  // Memoize callback to prevent recreation on every render
  const handleCloseContextMenu = React.useCallback(() => {
    setOpenMenuDocumentId(null);
  }, [setOpenMenuDocumentId]);

  // Memoize activeId to prevent recalculation
  const activeId = React.useMemo(() => activeDocument?.id, [activeDocument?.id]);

  // Memoize placeholderClientId to prevent unnecessary renderDocumentItem recreation
  const placeholderClientId = React.useMemo(
    () => placeholder?.clientId as string | undefined,
    [placeholder?.clientId],
  );

  // Intercept root inline create to insert placeholder item directly into the tree
  React.useEffect(() => {
    if (!inlineCreate) return;
    if (inlineCreate.parentId === null) {
      insertPlaceholder({
        type: inlineCreate.type,
        name: inlineCreate.name,
        parentId: null,
      });
      clearInlineCreate();
    }
  }, [inlineCreate, insertPlaceholder, clearInlineCreate]);

  // Memoize renderDocumentItem to prevent recreation on every render
  const renderDocumentItem = React.useCallback(
    ({ data: document, children }: Pick<{ data: any; children: any[] }, 'data' | 'children'>) => {
      const mapNode = (node: any, depth: number): any => {
        const mappedChildren = node.children.map((child: any) => mapNode(child, depth + 1));
        const hasActiveInChildren = mappedChildren.some((c: any) => c.isActive || c.isAncestor);
        const isNodeActive = node.data.id === activeId;
        const isNodeAncestor = !isNodeActive && hasActiveInChildren;
        // Only include placeholderClientId for the root level, not in children
        // This prevents unnecessary prop object recreation for all children
        const nodeProps: any = {
          document: node.data,
          children: mappedChildren,
          isActive: isNodeActive,
          isExpanded: isExpanded(node.data.id),
          isAncestor: isNodeAncestor,
          depth,
          openMenuDocumentId,
          onSelectDocument: handleSelectDocument,
          onToggleExpanded: toggleExpanded,
          onOpenContextMenu: setOpenMenuDocumentId,
          onInsertPlaceholder: insertPlaceholder,
          onRemovePlaceholder: removePlaceholder,
        };
        // Only add placeholderClientId at root level (depth 0)
        if (depth === 0) {
          nodeProps.placeholderClientId = placeholderClientId;
        }
        return nodeProps;
      };

      return (
        <DocumentItem
          key={(document as any).clientId ?? document.id}
          {...mapNode({ data: document, children }, 0)}
          openMenuDocumentId={openMenuDocumentId}
          onSelectDocument={handleSelectDocument}
          onToggleExpanded={toggleExpanded}
          onOpenContextMenu={setOpenMenuDocumentId}
          onCloseContextMenu={handleCloseContextMenu}
          onInsertPlaceholder={insertPlaceholder}
          onRemovePlaceholder={removePlaceholder}
          placeholderClientId={placeholderClientId}
        />
      );
    },
    [
      activeId,
      isExpanded,
      openMenuDocumentId,
      handleSelectDocument,
      toggleExpanded,
      setOpenMenuDocumentId,
      handleCloseContextMenu,
      insertPlaceholder,
      removePlaceholder,
      placeholderClientId,
    ],
  );

  return (
    <>
      <SidebarMenu className="min-h-0 overflow-x-hidden overflow-y-auto scrollbar-thin max-w-full gap-0.5 pr-0.5">
        {isLoading ? (
          <SidebarMenuSkeleton showIcon />
        ) : (
          rootDocuments.map((document: any) => renderDocumentItem(document))
        )}
      </SidebarMenu>
      {!isLoading && <CreateDocumentSection />}
    </>
  );
}
