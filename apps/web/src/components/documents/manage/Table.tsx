/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Suspense, useRef } from 'react';
import * as React from 'react';
import { ManageDocumentsHeader } from './Header';
import { ManageDocumentsTableContent } from './TableContent';
import type { ManageDocumentsTableContentHandle } from './TableContent';
import { useSelector } from '@/store';
import {
  useCopyDocumentMutation,
  useMoveDocumentMutation,
  useImportDocumentMutation,
  getAllDocumentsQueryOptions,
  ListDocumentResult,
} from '@/queries/documents';
import { Skeleton } from '@repo/ui/components/skeleton';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@repo/ui/components/context-menu';
import { FilePlus, FolderPlus, Clipboard, FolderInput } from '@repo/ui/components/icons';
import { useQueryClient } from '@tanstack/react-query';
import { sortByPosition, generatePositionKeyBetween } from '@repo/lib/utils/position';

export const ManageDocumentsTable = React.forwardRef<
  {
    beginRootInlineCreate: (type: 'note' | 'folder') => void;
    importDocuments: () => void;
    expandItem: (itemId: string) => void;
  },
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
>(function ManageDocumentsTable(
  { rootDocumentId, documents, onInsertPlaceholder, onRemovePlaceholder, placeholderClientId },
  ref,
) {
  const activeSpace = useSelector((state: any) => state.activeSpace);
  const clipboardDocument = useSelector((state) => state.documentsClipboard);
  const tableRef = useRef<ManageDocumentsTableContentHandle | null>(null);
  const queryClient = useQueryClient();

  // Mutations for paste functionality
  const copyDocumentMutation = useCopyDocumentMutation({
    spaceId: activeSpace?.id ?? '',
  });
  const moveDocumentMutation = useMoveDocumentMutation({
    spaceId: activeSpace?.id ?? '',
  });
  const importDocumentMutation = useImportDocumentMutation(null, activeSpace?.id ?? '');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handlePaste = React.useCallback(() => {
    if (!clipboardDocument) return;
    if (rootDocumentId) {
      tableRef.current?.expandItem(rootDocumentId);
    }
    if (clipboardDocument.type === 'move') {
      moveDocumentMutation.mutate();
    } else {
      copyDocumentMutation.mutate();
    }
  }, [clipboardDocument, rootDocumentId, moveDocumentMutation, copyDocumentMutation]);

  const canPaste =
    !!clipboardDocument && (clipboardDocument.type === 'copy' || clipboardDocument.type === 'move');

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.json')) {
      // For now, just log the error since we don't have toast in this component
      console.error('Please select a JSON file');
      return;
    }

    // Get current documents to calculate position at the end
    const currentDocuments = queryClient.getQueryData(
      getAllDocumentsQueryOptions(activeSpace?.id ?? '').queryKey,
    ) as ListDocumentResult;

    // Get root-level documents (those with parentId = null)
    const rootDocuments = currentDocuments?.filter((d) => d.parentId === null) || [];
    const sortedRootDocuments = sortByPosition(rootDocuments);

    // Calculate new position after the last root document
    let newPosition: string;
    if (sortedRootDocuments.length === 0) {
      newPosition = 'a0';
    } else {
      const lastPosition = sortedRootDocuments.at(-1)?.position ?? null;
      newPosition = generatePositionKeyBetween(lastPosition, null);
    }

    importDocumentMutation.mutate({
      file,
      position: newPosition,
    });

    // Reset file input
    event.target.value = '';
  };

  // Expose methods through ref
  React.useImperativeHandle(
    ref,
    () => ({
      beginRootInlineCreate: (type: 'note' | 'folder') => {
        tableRef.current?.beginRootInlineCreate(type);
      },
      importDocuments: () => {
        handleImport();
      },
      expandItem: (itemId: string) => {
        tableRef.current?.expandItem(itemId);
      },
    }),
    [handleImport],
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger className="flex-1">
        <div className="py-6 max-w-5xl w-full px-6 mx-auto overflow-auto flex flex-col flex-1">
          {activeSpace ? <ManageDocumentsHeader /> : null}
          <Suspense
            fallback={
              <div className="w-full min-w-fit select-none">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 border-b border-dashed hover:bg-muted/50 data-[state=selected]:bg-muted transition-colors">
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
            }
          >
            <ManageDocumentsTableContent
              ref={tableRef}
              rootDocumentId={rootDocumentId}
              documents={documents}
              onInsertPlaceholder={onInsertPlaceholder}
              onRemovePlaceholder={onRemovePlaceholder}
              placeholderClientId={placeholderClientId}
            />
          </Suspense>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          return;
        }}
      >
        <ContextMenuItem onSelect={handleCreateNote}>
          <FilePlus className="mr-2 h-4 w-4" />
          Create Document
        </ContextMenuItem>
        <ContextMenuItem onSelect={handleCreateFolder}>
          <FolderPlus className="mr-2 h-4 w-4" />
          Create Folder
        </ContextMenuItem>
        <ContextMenuItem onSelect={handleImport} disabled={importDocumentMutation.isPending}>
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
