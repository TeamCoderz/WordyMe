/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as React from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import z from 'zod';

import { ManageSpacesTopbar } from '@/components/spaces/manage/Topbar';
import { ManageSpacesTable as SpacesManageTable } from '@/components/spaces/manage/Table';
import { useQuery } from '@tanstack/react-query';
import { getAllSpacesQueryOptions, ListSpaceResult } from '@/queries/spaces';
import { toast } from 'sonner';
import { Suspense } from 'react';
import { Skeleton } from '@repo/ui/components/skeleton';
import { useImportSpaceMutation } from '@/queries/spaces';
import { useQueryClient } from '@tanstack/react-query';
import { getSiblings, sortByPosition, generatePositionKeyBetween } from '@repo/lib/utils/position';

const validateSearch = z.object({
  item: z.string().optional(),
});

export const Route = createFileRoute('/_authed/spaces/manage')({
  component: ManageSpacesPage,
  validateSearch,
});

function ManageSpacesPage() {
  const searchParams = Route.useSearch();
  const rootSpaceId = searchParams.item;
  const navigate = useNavigate();
  const { data: spacesData, isLoading } = useQuery(getAllSpacesQueryOptions);

  const [placeholder, setPlaceholder] = React.useState<ListSpaceResult[number] | null>(null);

  // Merge placeholder with spaces data
  const spacesWithPlaceholder = React.useMemo(() => {
    if (!spacesData) return spacesData;
    if (!placeholder) return spacesData;
    return [...spacesData, placeholder];
  }, [spacesData, placeholder]);

  const tableRef = React.useRef<{
    beginRootInlineCreate: (type: 'space' | 'folder') => void;
    expandItem: (itemId: string) => void;
  } | null>(null);
  const queryClient = useQueryClient();
  const importSpaceMutation = useImportSpaceMutation(null, null);

  const insertPlaceholder = React.useCallback(
    (params: { type: 'space' | 'folder'; name?: string; parentId: string | null }) => {
      if (!spacesData) return;

      const resolvedParentId = params.parentId === 'root' ? null : params.parentId;
      const siblings = getSiblings(spacesData, resolvedParentId);
      const sorted = sortByPosition(siblings);

      let position: string;
      if (sorted.length === 0) position = 'a0';
      else position = generatePositionKeyBetween(sorted.at(-1)?.position || 'a0', null);

      const clientId = crypto.randomUUID();
      const newPlaceholder: ListSpaceResult[number] = {
        id: 'new-space',
        clientId: clientId as any,
        name: params.name?.trim() || (params.type === 'folder' ? 'New Folder' : 'New Space'),
        handle: 'new-space',
        icon: params.type === 'folder' ? ('folder-closed' as any) : ('briefcase' as any),
        position,
        parentId: resolvedParentId,
        spaceId: null,
        createdAt: new Date(),
        isFavorite: false,
        isContainer: params.type === 'folder',
        updatedAt: new Date(),
        lastViewedAt: null,
        documentType: 'space',
        from: 'manage',
        userId: '',
        currentRevisionId: null,
      };

      setPlaceholder(newPlaceholder);
    },
    [spacesData],
  );

  const removePlaceholder = React.useCallback(() => {
    setPlaceholder(null);
  }, []);

  const handleImportSpace = () => {
    // Calculate position at the end of root spaces
    const currentSpaces = queryClient.getQueryData(
      getAllSpacesQueryOptions.queryKey,
    ) as ListSpaceResult;

    if (!currentSpaces) {
      toast.error('No spaces data available');
      return;
    }

    // Get root siblings (spaces with parentId null)
    const siblings = getSiblings(currentSpaces, null);
    const sortedSiblings = sortByPosition(siblings);

    let position: string;
    if (sortedSiblings.length === 0) {
      position = 'a0';
    } else {
      const lastPosition = sortedSiblings[sortedSiblings.length - 1].position || 'a0';
      position = generatePositionKeyBetween(lastPosition, null);
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        importSpaceMutation.mutate({ file, position });
      }
      input.remove();
    };
    input.click();
  };

  const effectiveRootId = React.useMemo(() => {
    if (!rootSpaceId || !Array.isArray(spacesWithPlaceholder)) return rootSpaceId;
    const byId = new Map((spacesWithPlaceholder as ListSpaceResult).map((s) => [s.id, s] as const));
    let current = byId.get(rootSpaceId);
    if (!current) return rootSpaceId;
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
    return rootSpaceId;
  }, [rootSpaceId, spacesWithPlaceholder]);

  React.useEffect(() => {
    if (isLoading) return;
    if (!rootSpaceId) return;
    const allSpaces = (spacesWithPlaceholder as ListSpaceResult) ?? [];
    const exists = allSpaces.some((s) => s.id === rootSpaceId);
    if (!exists) {
      navigate({ to: '/spaces/manage', search: {}, replace: true });
      toast.error('Manage spaces not found');
    }
  }, [rootSpaceId, spacesWithPlaceholder, navigate, isLoading]);
  const handleCreateSpace = React.useCallback(() => {
    if (rootSpaceId) {
      tableRef.current?.expandItem(rootSpaceId);
    }
    tableRef.current?.beginRootInlineCreate('space');
  }, [rootSpaceId]);

  const handleCreateFolder = React.useCallback(() => {
    if (rootSpaceId) {
      tableRef.current?.expandItem(rootSpaceId);
    }
    tableRef.current?.beginRootInlineCreate('folder');
  }, [rootSpaceId]);

  return (
    <div className="min-h-[calc(100vh-var(--spacing)*14-1px)] flex flex-col pb-6">
      <ManageSpacesTopbar
        onCreateSpace={handleCreateSpace}
        onCreateFolder={handleCreateFolder}
        onImportSpace={handleImportSpace}
      />
      <ManageSpacesTable
        rootSpaceId={effectiveRootId}
        ref={tableRef}
        spaces={spacesWithPlaceholder}
        onInsertPlaceholder={insertPlaceholder}
        onRemovePlaceholder={removePlaceholder}
        placeholderClientId={placeholder?.clientId as string | undefined}
      />
    </div>
  );
}

const ManageSpacesTable = React.forwardRef<
  {
    beginRootInlineCreate: (type: 'space' | 'folder') => void;
    expandItem: (itemId: string) => void;
  },
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
>(({ rootSpaceId, spaces, onInsertPlaceholder, onRemovePlaceholder, placeholderClientId }, ref) => {
  return (
    <Suspense
      fallback={
        <div className="py-6 max-w-5xl w-full px-6 mx-auto overflow-x-auto">
          <div className="min-w-fit w-full select-none">
            <div className="grid grid-cols-[minmax(16rem,2fr)_minmax(8rem,1fr)_minmax(10rem,1fr)_minmax(10rem,1fr)_auto] gap-4 border-b border-dashed hover:bg-accent/50 transition-colors">
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

            <div className="space-y-2 py-4">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4">
                <Skeleton className="h-5 w-64" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-8" />
              </div>
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4">
                <Skeleton className="h-5 w-52" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-8" />
              </div>
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4">
                <Skeleton className="h-5 w-72" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-8" />
              </div>
            </div>
          </div>
        </div>
      }
    >
      <SpacesManageTable
        rootSpaceId={rootSpaceId}
        ref={ref}
        spaces={spaces}
        onInsertPlaceholder={onInsertPlaceholder}
        onRemovePlaceholder={onRemovePlaceholder}
        placeholderClientId={placeholderClientId}
      />
    </Suspense>
  );
});
