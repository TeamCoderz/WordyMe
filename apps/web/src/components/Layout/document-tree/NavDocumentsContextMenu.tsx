/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';

import * as React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@repo/ui/components/context-menu';
import { FilePlus, FolderPlus, Settings2, Clipboard, FolderInput } from '@repo/ui/components/icons';
import { useActions, useSelector } from '@/store';
// Removed unused create mutations; we rely on inline create via store actions
import { useNavigate } from '@tanstack/react-router';
import { useSidebar } from '@repo/ui/components/sidebar';
import { useQueryClient } from '@tanstack/react-query';
import {
  getAllDocumentsQueryOptions,
  useCopyDocumentMutation,
  useMoveDocumentMutation,
  useImportDocumentMutation,
} from '@/queries/documents';
import { generatePositionKeyBetween, getSiblings, sortByPosition } from '@repo/lib/utils/position';
import { dispatchEscapeKey } from '@/utils/keyboard';

type NavDocumentsContextMenuProps = {
  children: React.ReactNode;
};

export function NavDocumentsContextMenu({ children }: NavDocumentsContextMenuProps) {
  // Keep selector if needed in future; currently not used
  // const activeSpace = useSelector((state) => state.activeSpace);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setInlineCreate } = useActions();
  const { isMobile: isMobileSidebar, setOpenMobile } = useSidebar();
  const clipboardDocument = useSelector((state) => state.documentsClipboard);
  const activeSpace = useSelector((state) => state.activeSpace);
  // Mutations for paste functionality
  const copyDocumentMutation = useCopyDocumentMutation({
    spaceId: activeSpace?.id ?? '',
  });
  const moveDocumentMutation = useMoveDocumentMutation({
    spaceId: activeSpace?.id ?? '',
  });
  const importDocumentMutation = useImportDocumentMutation(null, activeSpace?.id ?? '');

  const handleCreateNote = () => {
    dispatchEscapeKey();
    setTimeout(() => {
      setInlineCreate({ parentId: null, type: 'note', name: 'New Document' });
    }, 0);
  };

  const handleCreateFolder = () => {
    dispatchEscapeKey();
    setTimeout(() => {
      setInlineCreate({ parentId: null, type: 'folder', name: 'New Folder' });
    }, 0);
  };

  const handleManage = () => {
    document.body.style.pointerEvents = '';
    navigate({ to: '/docs/manage' });
    if (isMobileSidebar) {
      setOpenMobile(false);
    }
  };

  const handlePaste = () => {
    if (!clipboardDocument) return;

    if (clipboardDocument.type === 'move') {
      moveDocumentMutation.mutate();
    } else {
      copyDocumentMutation.mutate();
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Calculate position at the end
        const currentDocuments = queryClient.getQueryData(
          getAllDocumentsQueryOptions(activeSpace?.id ?? '').queryKey,
        ) as any[];

        if (!currentDocuments) {
          importDocumentMutation.mutate({ file });
          return;
        }

        // Get siblings (documents with the same parentId - null for root level)
        const siblings = getSiblings(currentDocuments, null);

        // Sort siblings by position
        const sortedSiblings = sortByPosition(siblings);

        let newPosition: string;
        if (sortedSiblings.length === 0) {
          // No siblings, use initial position
          newPosition = 'a0';
        } else {
          // Get the last sibling's position and generate a position after it
          const lastPosition = sortedSiblings.at(-1)?.position ?? null;
          // Generate a position after the last sibling
          newPosition = generatePositionKeyBetween(lastPosition, null);
        }

        importDocumentMutation.mutate({ file, position: newPosition });
      }
    };
    input.click();
  };

  const canPaste =
    !!clipboardDocument && (clipboardDocument.type === 'copy' || clipboardDocument.type === 'move');

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          return;
        }}
      >
        <ContextMenuItem onSelect={handleCreateNote}>
          <FilePlus className="mr-2 h-4 w-4" />
          Create Note
        </ContextMenuItem>
        <ContextMenuItem onSelect={handleCreateFolder}>
          <FolderPlus className="mr-2 h-4 w-4" />
          Create Folder
        </ContextMenuItem>
        <ContextMenuSeparator />

        <ContextMenuItem onSelect={handlePaste} className="opacity-100" disabled={!canPaste}>
          <Clipboard className="mr-2 h-4 w-4" />
          Paste
        </ContextMenuItem>
        <ContextMenuItem onSelect={handleImport}>
          <FolderInput className="mr-2 h-4 w-4" />
          Import Document
        </ContextMenuItem>

        <ContextMenuSeparator />
        <ContextMenuItem onSelect={handleManage}>
          <Settings2 className="mr-2 h-4 w-4" />
          Manage Documents
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
