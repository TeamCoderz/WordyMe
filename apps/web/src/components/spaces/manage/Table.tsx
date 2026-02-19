/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as React from 'react';
import { useRef } from 'react';
import { ManageSpacesTableContent } from './TableContent';
import type { ManageSpacesTableContentHandle } from './TableContent';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@repo/ui/components/context-menu';
import { FolderPlus, Clipboard, FolderInput, BriefcaseMedical } from '@repo/ui/components/icons';
import { useSelector } from '@/store';
import {
  useCopySpaceMutation,
  useMoveSpaceMutation,
  useImportSpaceMutation,
  getAllSpacesQueryOptions,
  ListSpaceResult,
} from '@/queries/spaces';
import { useQueryClient } from '@tanstack/react-query';
import { sortByPosition, generatePositionKeyBetween } from '@repo/lib/utils/position';

export const ManageSpacesTable = React.forwardRef<
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
  const tableRef = useRef<ManageSpacesTableContentHandle | null>(null);
  const clipboardSpace = useSelector((state) => state.spacesClipboard);
  const queryClient = useQueryClient();

  // Root-level paste mutations for spaces
  const copySpaceMutation = useCopySpaceMutation(null);
  const moveSpaceMutation = useMoveSpaceMutation(null);
  const importSpaceMutation = useImportSpaceMutation(null, null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handlePaste = React.useCallback(() => {
    if (!clipboardSpace) return;
    if (rootSpaceId) {
      tableRef.current?.expandItem(rootSpaceId);
    }
    if (clipboardSpace.type === 'move') {
      moveSpaceMutation.mutate();
    } else {
      copySpaceMutation.mutate();
    }
  }, [clipboardSpace, rootSpaceId, moveSpaceMutation, copySpaceMutation]);

  const canPaste =
    !!clipboardSpace && (clipboardSpace.type === 'copy' || clipboardSpace.type === 'move');

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.json')) {
      console.error('Please select a JSON file');
      return;
    }

    // Get current spaces to calculate position at the end
    const currentSpaces = queryClient.getQueryData(
      getAllSpacesQueryOptions.queryKey,
    ) as ListSpaceResult;

    // Get root-level spaces (those with parentId = null)
    const rootSpaces = currentSpaces?.filter((s) => s.parentId === null) || [];
    const sortedRootSpaces = sortByPosition(rootSpaces);

    // Calculate new position after the last root space
    let newPosition: string;
    if (sortedRootSpaces.length === 0) {
      newPosition = 'a0';
    } else {
      const lastPosition = sortedRootSpaces.at(-1)?.position ?? null;
      newPosition = generatePositionKeyBetween(lastPosition, null);
    }

    importSpaceMutation.mutate({
      file,
      position: newPosition,
    });

    // Reset file input
    event.target.value = '';
  };

  React.useImperativeHandle(ref, () => ({
    beginRootInlineCreate: (type: 'space' | 'folder') => {
      tableRef.current?.beginRootInlineCreate(type);
    },
    expandItem: (itemId: string) => {
      tableRef.current?.expandItem(itemId);
    },
  }));

  return (
    <ContextMenu>
      <ContextMenuTrigger className="flex-1">
        <div className="py-6 max-w-5xl w-full px-6 mx-auto overflow-x-auto">
          <ManageSpacesTableContent
            ref={tableRef}
            rootSpaceId={rootSpaceId}
            spaces={spaces}
            onInsertPlaceholder={onInsertPlaceholder}
            onRemovePlaceholder={onRemovePlaceholder}
            placeholderClientId={placeholderClientId}
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          return;
        }}
      >
        <ContextMenuItem onSelect={handleCreateSpace}>
          <BriefcaseMedical className="mr-2 h-4 w-4" />
          Create Space
        </ContextMenuItem>
        <ContextMenuItem onSelect={handleCreateFolder}>
          <FolderPlus className="mr-2 h-4 w-4" />
          Create Folder
        </ContextMenuItem>
        <ContextMenuItem onSelect={handleImport} disabled={importSpaceMutation.isPending}>
          <FolderInput className="mr-2 h-4 w-4" />
          Import
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={handlePaste} disabled={!canPaste}>
          <Clipboard className="mr-2 h-4 w-4" />
          Paste
        </ContextMenuItem>
      </ContextMenuContent>
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </ContextMenu>
  );
});

//
