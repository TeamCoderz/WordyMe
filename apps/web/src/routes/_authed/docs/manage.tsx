/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as React from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import z from 'zod';
import { ManageDocumentsTopbar } from '@/components/documents/manage/Topbar';
import { ManageDocumentsTable } from '@/components/documents/manage/Table';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from '@/store';
import { getAllDocumentsQueryOptions, ListDocumentResult } from '@/queries/documents';
import { toast } from 'sonner';
import { getSiblings, sortByPosition, generatePositionKeyBetween } from '@repo/lib/utils/position';

const validateSearch = z.object({
  item: z.string().optional(),
});

export const Route = createFileRoute('/_authed/docs/manage')({
  component: ManageDocumentsPage,
  validateSearch,
});

function ManageDocumentsPage() {
  const searchParams = Route.useSearch();
  const rootDocumentId = searchParams.item;
  const navigate = useNavigate();
  const spaceID = useSelector((state: any) => state.activeSpace?.id);

  const { data: documentsData, isLoading } = useQuery({
    ...getAllDocumentsQueryOptions(spaceID!),
    enabled: !!spaceID,
  });

  const [placeholder, setPlaceholder] = React.useState<ListDocumentResult[number] | null>(null);

  // Merge placeholder with documents data
  const documentsWithPlaceholder = React.useMemo(() => {
    if (!documentsData) return documentsData;
    if (!placeholder) return documentsData;
    return [...documentsData, placeholder];
  }, [documentsData, placeholder]);

  const tableRef = React.useRef<{
    beginRootInlineCreate: (type: 'note' | 'folder') => void;
    importDocuments: () => void;
    expandItem: (itemId: string) => void;
  } | null>(null);

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
        spaceId: spaceID,
        createdAt: new Date(),
        isFavorite: false,
        isContainer: params.type === 'folder',
        updatedAt: new Date(),
        lastViewedAt: null,
        documentType: params.type === 'folder' ? ('folder' as any) : ('note' as any),
        from: 'manage',
        userId: '',
        currentRevisionId: null,
      };

      setPlaceholder(newPlaceholder);
    },
    [documentsData, spaceID],
  );

  const removePlaceholder = React.useCallback(() => {
    setPlaceholder(null);
  }, []);

  const effectiveRootId = React.useMemo(() => {
    if (!rootDocumentId || !Array.isArray(documentsWithPlaceholder)) return rootDocumentId;
    const byId = new Map((documentsWithPlaceholder as any[]).map((d) => [d.id, d] as const));
    let current = byId.get(rootDocumentId);
    if (!current) return rootDocumentId;
    // If selected is not a container, climb to nearest ancestor container
    if (current.isContainer !== true) {
      while (current && current.parentId) {
        const parent = byId.get(current.parentId);
        if (!parent) break;
        if (parent.isContainer === true) {
          return parent.id as string;
        }
        current = parent;
      }
      // No container ancestor found → fall back to null (show full tree)
      return undefined;
    }
    return rootDocumentId;
  }, [rootDocumentId, documentsWithPlaceholder]);

  const handleCreateNote = React.useCallback(() => {
    if (rootDocumentId) {
      tableRef.current?.expandItem(rootDocumentId);
    }
    tableRef.current?.beginRootInlineCreate('note');
  }, [rootDocumentId]);

  const handleCreateFolder = React.useCallback(() => {
    if (rootDocumentId) {
      tableRef.current?.expandItem(rootDocumentId);
    }
    tableRef.current?.beginRootInlineCreate('folder');
  }, [rootDocumentId]);

  React.useEffect(() => {
    if (isLoading) return;
    if (!rootDocumentId) return;
    const documents = (documentsWithPlaceholder as any[]) ?? [];
    const exists = documents.some((d) => d.id === rootDocumentId);
    if (!exists) {
      navigate({ to: '/docs/manage', search: {}, replace: true });
      toast.error('Manage documents not found');
    }
  }, [rootDocumentId, documentsWithPlaceholder, navigate, isLoading]);
  return (
    <div className="min-h-[calc(100vh-var(--spacing)*14-1px)] flex flex-col pb-6">
      <ManageDocumentsTopbar
        onCreateNote={handleCreateNote}
        onCreateFolder={handleCreateFolder}
        onImportDocument={() => tableRef.current?.importDocuments()}
      />
      <ManageDocumentsTable
        rootDocumentId={effectiveRootId}
        ref={tableRef}
        documents={documentsWithPlaceholder}
        onInsertPlaceholder={insertPlaceholder}
        onRemovePlaceholder={removePlaceholder}
        placeholderClientId={placeholder?.clientId as string | undefined}
      />
    </div>
  );
}
