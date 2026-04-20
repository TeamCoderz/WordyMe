/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as React from 'react';
import { Button } from '@repo/ui/components/button';
import { DynamicIcon } from '@repo/ui/components/dynamic-icon';
import { IconPicker } from '@repo/ui/components/icon-picker';
import { TreeItem } from '@repo/ui/components/tree';
import { Input } from '@repo/ui/components/input';
import { cn } from '@repo/ui/lib/utils';
import {
  ChevronRight,
  GripVertical,
  MoreHorizontal,
  PencilLine,
  Repeat2,
  Trash2,
  Star,
  FilePlus,
  CopyPlus,
  Copy,
  Clipboard,
  Scissors,
  FolderPlus,
  FolderOutput,
  FolderInput,
} from '@repo/ui/components/icons';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  useRenameDocumentMutation,
  useUpdateDocumentIconMutation,
  useCreateDocumentMutation,
  useDocumentFavoritesMutation,
  useDeleteDocumentMutation,
  useDuplicateDocumentMutation,
  useCopyDocumentMutation,
  useMoveDocumentMutation,
  useCreateContainerDocumentMutation,
  useExportDocumentMutation,
  useImportDocumentMutation,
  getAllDocumentsQueryOptions,
} from '@/queries/documents';
import type { ListDocumentRow, DocumentList } from '@repo/types';
import { Link } from '@tanstack/react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { alert } from '@/components/Layout/alert';
import { generatePositionKeyBetween } from '@repo/lib/utils/position';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@repo/ui/components/context-menu';
import { useSelector, useActions } from '@/store';
import { useQueryClient } from '@tanstack/react-query';
import { isDocumentCached } from '@/queries/caches/documents';
import { ItemInstance, TreeInstance } from '@headless-tree/core';
import { TreeNode } from '@repo/lib/data/tree';
type DocumentTreeNode = TreeNode<ListDocumentRow>;
type DocumentTreeItem = ItemInstance<DocumentTreeNode>;

export interface ManageDocumentsTableRowProps {
  item: DocumentTreeItem;
  index: number;
  isLast: boolean;
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
  tree: TreeInstance<DocumentTreeNode>;
  getDescendantIds: (nodeId: string) => string[];
  spaceID: string;
  onBeginInlineCreate?: (type: 'note' | 'folder') => void;
  onRemovePlaceholder?: () => void;
  placeholderClientId?: string;
}

export function ManageDocumentsTableRow({
  item,
  isLast,
  draggingId,
  setDraggingId,
  tree,
  getDescendantIds,
  spaceID,
  onBeginInlineCreate,
  onRemovePlaceholder,
  placeholderClientId,
}: ManageDocumentsTableRowProps) {
  const doc = item.getItemData().data;
  const isCreating = doc?.id === doc?.clientId || doc?.id === 'new-doc';
  const isPlaceholder = doc?.id === 'new-doc';
  const [placeholderName, setPlaceholderName] = React.useState<string>(doc?.name ?? '');
  const placeholderInputRef = React.useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const isSubmittingPlaceholderRef = React.useRef<boolean>(false);
  const isSubmittingRenameRef = React.useRef<boolean>(false);

  const { updateDocumentName, isPending: isRenamePending } = useRenameDocumentMutation({
    document: doc,
  });

  const { updateDocumentIcon: updateIcon } = useUpdateDocumentIconMutation({
    document: doc,
  });

  const createDocumentMutation = useCreateDocumentMutation({
    document: doc,
    from: 'manage',
  });

  const createFolderMutation = useCreateContainerDocumentMutation({
    document: doc,
    from: 'manage',
  });

  const { addToDocumentFavorites, removeDocumentFromFavorites } = useDocumentFavoritesMutation();
  const deleteDocumentMutation = useDeleteDocumentMutation({ document: doc });
  const duplicateDocumentMutation = useDuplicateDocumentMutation({
    document: doc,
  });
  const copyDocumentMutation = useCopyDocumentMutation(doc);
  const moveDocumentMutation = useMoveDocumentMutation(doc);
  const { mutate: exportDocument, isPending: isExportingDocument } = useExportDocumentMutation(
    doc.id,
    doc.name,
  );
  const importDocumentMutation = useImportDocumentMutation(doc.id, spaceID);
  const { setDocumentsClipboard } = useActions();
  const clipboardDocument = useSelector((state) => state.wordy.documentsClipboard);
  const isCutThisItem =
    clipboardDocument?.type === 'move' && clipboardDocument.document.id === doc.id;

  const [isRenaming, setIsRenaming] = React.useState(false);
  const [isMenuIconPickerOpen, setIsMenuIconPickerOpen] = React.useState(false);
  const [renameName, setRenameName] = React.useState<string>(doc.name);
  const renameInputRef = React.useRef<HTMLInputElement>(null);
  const dragImageRef = React.useRef<HTMLImageElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      const el = renameInputRef.current;
      setTimeout(() => {
        el.focus();
        el.select();
      }, 0);
    }
  }, [isRenaming]);

  // Focus placeholder input when present
  React.useEffect(() => {
    if (isPlaceholder && placeholderInputRef.current) {
      const el = placeholderInputRef.current;
      setTimeout(() => {
        el.focus();
        el.select();
      }, 0);
    }
  }, [isPlaceholder]);

  // Prepare a transparent drag image once on mount
  React.useEffect(() => {
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
    dragImageRef.current = img;
  }, []);

  // Scroll into view when isCreating and from manage
  React.useEffect(() => {
    if (!isCreating || isPlaceholder) return;
    const createdFrom = doc.from;
    if (createdFrom === 'manage') {
      try {
        // Use setTimeout to ensure DOM is updated
        setTimeout(() => {
          const el = document.querySelector(
            `[data-manage-document-id="${doc.id}"]`,
          ) as HTMLElement | null;
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 100);
      } catch (error) {
        console.error('Scroll error:', error);
      }
    }
  }, [isCreating, isPlaceholder, doc.id, doc.from]);

  const handleRename = () => {
    setIsRenaming(true);
    setRenameName(doc.name ?? '');
  };

  const handleRenameSubmit = async () => {
    if (isRenamePending || isSubmittingRenameRef.current) return;
    isSubmittingRenameRef.current = true;
    if (renameName.trim() && renameName.trim() !== doc.name) {
      try {
        await updateDocumentName(doc.id ?? '', renameName.trim());
      } catch {
        toast.error('Failed to rename document');
        setRenameName(doc.name ?? '');
      } finally {
        isSubmittingRenameRef.current = false;
      }
    } else {
      isSubmittingRenameRef.current = false;
    }
    setIsRenaming(false);
  };

  const handleRenameCancel = () => {
    setIsRenaming(false);
    setRenameName(doc.name ?? '');
  };

  const handleIconChange = async (newIcon: string) => {
    try {
      await updateIcon(doc.id ?? '', newIcon);
    } catch {
      toast.error('Failed to update document icon');
    } finally {
      setIsMenuIconPickerOpen(false);
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.json')) {
      toast.error('Please select a JSON file');
      return;
    }

    // Get current documents to calculate position
    const currentDocuments = queryClient.getQueryData(
      getAllDocumentsQueryOptions(spaceID).queryKey,
    ) as DocumentList;
    if (!currentDocuments) {
      toast.error('Unable to get current documents');
      return;
    }

    // Get siblings (documents with the same parentId)
    const siblings = currentDocuments.filter((d) => d.parentId === doc?.id);
    const sortedSiblings = siblings.sort((a, b) =>
      (a.position || '').localeCompare(b.position || ''),
    );

    // Calculate new position after the last sibling
    let newPosition: string;
    if (sortedSiblings.length === 0) {
      newPosition = 'a0';
    } else {
      const lastPosition = sortedSiblings.at(-1)?.position ?? null;
      newPosition = generatePositionKeyBetween(lastPosition, null);
    }

    importDocumentMutation.mutate({
      file,
      position: newPosition,
    });

    // Reset file input
    event.target.value = '';
  };

  const handleAddChildDocument = () => {
    if (!doc?.id) return;
    // Ensure this folder row is expanded before adding child
    try {
      const isOpen = typeof item.isExpanded === 'function' ? item.isExpanded() : false;
      if (!isOpen) item.expand();
    } catch {
      // ignore
    }
    if (onBeginInlineCreate) {
      onBeginInlineCreate('note');
    } else {
      createDocumentMutation.mutate({
        parentId: doc.id,
        spaceId: spaceID,
        clientId: doc.clientId as string,
      });
    }
  };

  const handleAddChildFolder = () => {
    if (!doc?.id) return;
    // Ensure this folder row is expanded before adding child
    try {
      const isOpen = typeof item.isExpanded === 'function' ? item.isExpanded() : false;
      if (!isOpen) item.expand();
    } catch {
      // ignore
    }
    if (onBeginInlineCreate) {
      onBeginInlineCreate('folder');
    } else {
      createFolderMutation.mutate({
        parentId: doc.id,
        spaceId: spaceID,
        clientId: doc.clientId as string,
      });
    }
  };

  const removePlaceholderHandler = React.useCallback(() => {
    onRemovePlaceholder?.();
  }, [onRemovePlaceholder]);

  const submitPlaceholder = async () => {
    if (!isPlaceholder) return;
    if (isSubmittingPlaceholderRef.current) return;
    const name = placeholderName.trim();
    if (!name) {
      removePlaceholderHandler();
      return;
    }
    isSubmittingPlaceholderRef.current = true;
    if (doc.isContainer === true) {
      createFolderMutation.mutateAsync(
        {
          parentId: doc.parentId ?? null,
          spaceId: spaceID,
          name,
          clientId: doc.clientId ?? '',
        },
        {
          onSuccess: (data) => {
            queryClient.setQueryData(
              getAllDocumentsQueryOptions(spaceID).queryKey,
              (old: DocumentList) => {
                removePlaceholderHandler();
                if (old) {
                  if (!isDocumentCached(data?.clientId as string) && data) {
                    return [...old, data];
                  }
                }
                return old;
              },
            );
          },
          onError: () => {
            removePlaceholderHandler();
          },
          onSettled: () => {
            isSubmittingPlaceholderRef.current = false;
          },
        },
      );
    } else {
      createDocumentMutation.mutateAsync(
        {
          parentId: doc.parentId ?? null,
          spaceId: spaceID,
          name,
          clientId: doc.clientId as string,
        },
        {
          onSuccess: (data) => {
            // Add to query cache if not already there
            queryClient.setQueryData(
              getAllDocumentsQueryOptions(spaceID).queryKey,
              (old: DocumentList) => {
                removePlaceholderHandler();
                if (old && data) {
                  if (!isDocumentCached(data.clientId as string)) {
                    return [...old, data];
                  }
                }
                return old;
              },
            );
          },
          onError: () => {
            removePlaceholderHandler();
          },
          onSettled: () => {
            isSubmittingPlaceholderRef.current = false;
          },
        },
      );
    }
  };

  const cancelPlaceholder = () => {
    if (!isPlaceholder) return;
    removePlaceholderHandler();
  };

  // Reset placeholder when the actual document is created
  React.useLayoutEffect(() => {
    if (
      doc?.id !== 'new-doc' &&
      doc?.clientId &&
      placeholderClientId &&
      doc?.clientId === placeholderClientId
    ) {
      removePlaceholderHandler();
    }
  }, [doc?.id, doc?.clientId, placeholderClientId, removePlaceholderHandler]);

  const handleAddToFavorites = () => {
    if (!doc?.id) return;
    addToDocumentFavorites({
      documentId: doc.id,
      spaceId: doc.spaceId ?? spaceID,
    });
  };
  const handleRemoveFromFavorites = () => {
    if (!doc?.id) return;
    removeDocumentFromFavorites({
      documentId: doc.id,
      spaceId: doc.spaceId ?? spaceID,
    });
  };
  const handleDelete = () => {
    if (!doc?.id) return;
    const isFolder = doc.isContainer === true;
    alert({
      title: isFolder ? `Delete Folder: ${doc.name}` : `Delete Document: ${doc.name}`,
      description: isFolder
        ? 'Are you sure you want to delete this folder? deleting this folder will also delete all of its children.'
        : 'Are you sure you want to delete this document? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: () => deleteDocumentMutation.mutate({ documentId: doc.id }),
      buttonVariant: 'destructive',
    });
  };

  const handleDuplicate = () => {
    if (!doc?.id) return;
    duplicateDocumentMutation.mutate();
  };

  const handleCopy = () => {
    if (!doc?.id) return;
    setDocumentsClipboard(doc, 'copy');
    toast.success('Document copied to clipboard');
  };

  const handleCut = () => {
    if (!doc?.id) return;
    setDocumentsClipboard(doc, 'move');
    toast.success('Document cut to clipboard');
  };

  const handlePaste = () => {
    if (!clipboardDocument || !doc?.id) return;
    // Expand the item first if it's not already expanded
    try {
      const isOpen = typeof item.isExpanded === 'function' ? item.isExpanded() : false;
      if (!isOpen) item.expand();
    } catch {
      // ignore
    }
    if (clipboardDocument.type === 'move') {
      // Use move mutation for cut operation
      moveDocumentMutation.mutate();
    } else {
      // Use copy mutation for copy operation
      copyDocumentMutation.mutate();
    }
  };

  const canPaste =
    !!clipboardDocument &&
    (clipboardDocument.type === 'copy' || clipboardDocument.type === 'move') &&
    clipboardDocument.document.id !== (doc?.id ?? '');

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <TreeItem
          key={doc.clientId ?? item.getId()}
          item={item}
          asChild
          className="ps-0"
          onDragStartCapture={(e) => {
            const node = e.target as unknown as Node | null;
            const el =
              node && node.nodeType === 1
                ? (node as unknown as Element)
                : node && node.parentElement
                  ? (node.parentElement as Element)
                  : null;
            if (!el) return;
            if (!el.closest('[data-drag-handle="true"]')) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          <div
            data-manage-document-id={doc?.id ?? ''}
            className={cn(
              `grid grid-cols-[minmax(16rem,2fr)_minmax(8rem,1fr)_minmax(10rem,1fr)_minmax(10rem,1fr)_auto] ps-0 gap-4 py-3 hover:bg-accent/50 group group/item`,
              !isLast && 'border-b border-dashed border-border/50',
              draggingId === item.getId() && 'opacity-50',
              typeof item.isDragTarget === 'function' && item.isDragTarget() && 'bg-muted/50',
              isCutThisItem && 'bg-muted border border-dashed border-border/60',
              isCreating && !isPlaceholder && 'bg-accent/30',
            )}
          >
            <div className="flex items-center gap-2 text-foreground px-2 h-10 min-w-0">
              <div className="flex items-center justify-center">
                <button
                  data-drag-handle="true"
                  draggable
                  className="p-1 hover:bg-accent/50 rounded-sm cursor-grab active:cursor-grabbing"
                  aria-label="Drag to reorder"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDragStart={(e) => {
                    setDraggingId(item.getId());
                    const dt = e.dataTransfer;
                    if (dt) {
                      dt.setData('text/plain', ' ');
                      if (typeof dt.setDragImage === 'function' && dragImageRef.current) {
                        dt.setDragImage(dragImageRef.current, 0, 0);
                      }
                    }
                  }}
                  onDragEnd={() => setDraggingId(null)}
                >
                  <GripVertical className="size-4 text-muted-foreground" />
                </button>
              </div>
              <div className="flex items-center gap-2 ps-[clamp(0px,var(--tree-padding),calc(var(--spacing)*32))] min-w-0 flex-1">
                <div className="flex items-center justify-center">
                  {(() => {
                    return doc.isContainer === true || item.getChildren()?.length > 0;
                  })() ? (
                    <button
                      data-expand-toggle="true"
                      className="p-1 hover:bg-accent/50 rounded-sm"
                      aria-label={item.isExpanded() ? 'Collapse' : 'Expand'}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const isOpen = item.isExpanded();
                        const items = tree.getItems();
                        if (isOpen) {
                          item.collapse();
                          const ids = getDescendantIds(item.getId());
                          for (const id of ids) {
                            const child = items.find((it) => it.getId() === id);
                            if (!child) continue;
                            child.collapse();
                          }
                        } else {
                          item.expand();
                        }
                      }}
                    >
                      <ChevronRight
                        className={cn(
                          'size-4 text-muted-foreground transition-transform',
                          item.isExpanded() && 'rotate-90',
                        )}
                      />
                    </button>
                  ) : (
                    <div className="size-6" />
                  )}
                </div>
                <IconPicker
                  value={doc.icon || 'file'}
                  onValueChange={handleIconChange}
                  side="right"
                  align="start"
                  sideOffset={8}
                  alignOffset={-4}
                >
                  <button
                    type="button"
                    data-icon-trigger="true"
                    className="flex items-center justify-center p-0.5 hover:bg-accent/50 rounded-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    disabled={isCreating}
                  >
                    <DynamicIcon className="size-4" name={doc.icon || 'file'} />
                  </button>
                </IconPicker>
                {isPlaceholder ? (
                  <Input
                    ref={placeholderInputRef}
                    data-rename-input="true"
                    value={placeholderName}
                    onChange={(e) => setPlaceholderName(e.target.value)}
                    onContextMenu={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        submitPlaceholder();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelPlaceholder();
                      }
                    }}
                    onBlur={() => {
                      submitPlaceholder();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="h-6 text-sm px-1 py-0 border-0 bg-transparent focus-visible:border-0 focus-visible:ring-0 focus-visible:outline-none shadow-none flex-1 min-w-0 [&:focus]:border-0 [&:focus]:ring-0 [&:focus]:outline-none"
                    autoFocus
                  />
                ) : isRenaming ? (
                  <Input
                    ref={renameInputRef}
                    data-rename-input="true"
                    onContextMenu={(e) => e.stopPropagation()}
                    value={renameName}
                    onChange={(e) => setRenameName(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleRenameSubmit();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        handleRenameCancel();
                      }
                    }}
                    onBlur={() => {
                      handleRenameSubmit();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="h-6 text-sm px-1 py-0 border-0 bg-transparent focus-visible:border-0 focus-visible:ring-0 focus-visible:outline-none shadow-none flex-1 min-w-0 [&:focus]:border-0 [&:focus]:ring-0 [&:focus]:outline-none"
                    autoFocus
                  />
                ) : (
                  (() => {
                    const isContainer = doc.isContainer === true;
                    if (isContainer) {
                      return (
                        <button
                          className="truncate text-left text-sm select-text hover:underline max-w-full flex-1"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const isOpen = item.isExpanded();
                            if (isOpen) item.collapse();
                            else item.expand();
                          }}
                        >
                          {doc.name}
                        </button>
                      );
                    }
                    return (
                      <Link
                        to="/view/$handle"
                        params={{ handle: doc.handle ?? doc.id }}
                        onClick={(e) => {
                          // Avoid interfering with tree selection mechanics
                          e.stopPropagation();
                        }}
                        className="truncate text-sm select-text hover:underline max-w-full flex-1"
                      >
                        {doc.name}
                      </Link>
                    );
                  })()
                )}
              </div>
            </div>
            <div className="capitalize text-muted-foreground text-sm px-2 h-10 select-text flex items-center">
              {doc.isContainer === true ? 'folder' : 'note'}
            </div>
            <div className="text-sm text-muted-foreground px-2 h-10 select-text flex items-center text-nowrap">
              {(() => {
                return doc?.createdAt ? format(new Date(doc.createdAt), 'MMMM d, yyyy') : '—';
              })()}
            </div>
            <div className="text-sm text-muted-foreground px-2 h-10 select-text flex items-center text-nowrap">
              {(() => {
                return doc?.updatedAt
                  ? (() => {
                      const date = new Date(doc.updatedAt);
                      const now = new Date();
                      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
                      if (diffInSeconds < 60) {
                        return diffInSeconds <= 5 ? 'JUST NOW' : `${diffInSeconds} seconds ago`;
                      }
                      return formatDistanceToNow(date, { addSuffix: true });
                    })()
                  : '—';
              })()}
            </div>
            <div className="flex justify-end px-2 h-10 relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    data-menu-trigger="true"
                    size={'icon'}
                    variant={'ghost'}
                    className="text-muted-foreground hover:!bg-input hover:border"
                    disabled={isCreating}
                  >
                    <MoreHorizontal className="size-5" />
                  </Button>
                </DropdownMenuTrigger>
                {!isCreating && (
                  <DropdownMenuContent
                    align="end"
                    sideOffset={8}
                    alignOffset={-4}
                    className="p-2 min-w-56"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onCloseAutoFocus={(e: Event) => {
                      e.preventDefault();
                      try {
                        const input = document.querySelector<HTMLInputElement>(
                          '[data-inline-create-input="true"]',
                        );
                        if (input) {
                          input.focus();
                          input.select();
                        }
                      } catch {
                        // ignore focus errors
                      }
                    }}
                  >
                    {doc.isContainer === true && (
                      <>
                        <DropdownMenuItem className="group" onSelect={handleAddChildDocument}>
                          <FilePlus className="mr-2 h-4 w-4 group-hover:text-foreground" />
                          Add Child Document
                        </DropdownMenuItem>
                        <DropdownMenuItem className="group" onSelect={handleAddChildFolder}>
                          <FolderPlus className="mr-2 h-4 w-4 group-hover:text-foreground" />
                          Add Child Folder
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem
                      className="group"
                      onSelect={() => {
                        handleRename();
                      }}
                    >
                      <PencilLine className="mr-2 h-4 w-4 group-hover:text-foreground" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="group"
                      onSelect={() => setIsMenuIconPickerOpen(true)}
                    >
                      <Repeat2 className="mr-2 h-4 w-4 group-hover:text-foreground" />
                      Change Icon
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={isExportingDocument}
                      onSelect={() => exportDocument()}
                      className="group"
                    >
                      <FolderOutput className="mr-2 h-4 w-4 group-hover:text-foreground" />
                      Export
                    </DropdownMenuItem>
                    {doc.isContainer === true && (
                      <DropdownMenuItem
                        disabled={importDocumentMutation.isPending}
                        onSelect={handleImport}
                        className="group"
                      >
                        <FolderInput className="mr-2 h-4 w-4 group-hover:text-foreground" />
                        Import
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="group" onSelect={handleCopy}>
                      <Copy className="mr-2 h-4 w-4 group-hover:text-foreground" />
                      Copy
                    </DropdownMenuItem>
                    {doc.isContainer !== true && (
                      <DropdownMenuItem className="group" onSelect={handleCut}>
                        <Scissors className="mr-2 h-4 w-4 group-hover:text-foreground" />
                        Cut
                      </DropdownMenuItem>
                    )}
                    {doc.isContainer === true && (
                      <>
                        <DropdownMenuItem className="group" onSelect={handleCut}>
                          <Scissors className="mr-2 h-4 w-4 group-hover:text-foreground" />
                          Cut
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className={cn('group', !canPaste && 'opacity-50 cursor-not-allowed')}
                          onSelect={canPaste ? handlePaste : undefined}
                          disabled={!canPaste}
                        >
                          <Clipboard className="mr-2 h-4 w-4 group-hover:text-foreground" />
                          Paste
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem className="group" onSelect={handleDuplicate}>
                      <CopyPlus className="mr-2 h-4 w-4 group-hover:text-foreground" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {doc.isContainer !== true &&
                      (doc.isFavorite ? (
                        <>
                          {' '}
                          <DropdownMenuItem
                            className="group"
                            onSelect={() => handleRemoveFromFavorites()}
                          >
                            <Star
                              className={cn(
                                'mr-2 h-4 w-4 fill-current group-hover:text-foreground',
                                'fill-amber-400',
                              )}
                            />
                            Remove from Favorites
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      ) : (
                        <>
                          <DropdownMenuItem className="group" onSelect={handleAddToFavorites}>
                            <Star className={cn('mr-2 h-4 w-4 group-hover:text-foreground')} />
                            Add to Favorites
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      ))}
                    <DropdownMenuItem
                      className="group focus:bg-destructive/10 text-destructive hover:text-destructive focus:text-destructive"
                      onSelect={handleDelete}
                    >
                      <Trash2 className="mr-2 h-4 w-4 group-focus:!text-destructive" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                )}
              </DropdownMenu>
              <IconPicker
                value={doc.icon || 'file'}
                onValueChange={handleIconChange}
                open={isMenuIconPickerOpen}
                onOpenChange={(open) => {
                  if (!open) setIsMenuIconPickerOpen(false);
                }}
                side="right"
                align="start"
                sideOffset={8}
                alignOffset={-4}
              >
                <div className="pointer-events-none absolute top-full right-1/2 -translate-x-1/2" />
              </IconPicker>
            </div>
          </div>
        </TreeItem>
      </ContextMenuTrigger>
      {!isCreating && (
        <ContextMenuContent
          className="p-2 min-w-56 relative"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onCloseAutoFocus={(e: Event) => {
            e.preventDefault();
            try {
              const input = document.querySelector(
                '[data-inline-create-input="true"]',
              ) as HTMLInputElement | null;
              if (input) {
                input.focus();
                input.select();
              }
            } catch {
              // ignore focus errors
            }
          }}
        >
          {doc.isContainer === true && (
            <>
              <ContextMenuItem onSelect={handleAddChildDocument}>
                <FilePlus className="mr-2 h-4 w-4" />
                Add Child Document
              </ContextMenuItem>
              <ContextMenuItem onSelect={handleAddChildFolder}>
                <FolderPlus className="mr-2 h-4 w-4" />
                Add Child Folder
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem
            onSelect={() => {
              handleRename();
            }}
          >
            <PencilLine className="mr-2 h-4 w-4" />
            Rename
          </ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Repeat2 className="mr-2 h-4 w-4" />
              Change Icon
            </ContextMenuSubTrigger>
            <ContextMenuSubContent
              className="p-2 rounded-2xl"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <IconPicker
                value={doc.icon || 'file'}
                onValueChange={handleIconChange}
                inPlace
                searchable
              />
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuItem disabled={isExportingDocument} onSelect={() => exportDocument()}>
            <FolderOutput className="mr-2 h-4 w-4" />
            Export
          </ContextMenuItem>
          {doc.isContainer === true && (
            <ContextMenuItem disabled={importDocumentMutation.isPending} onSelect={handleImport}>
              <FolderInput className="mr-2 h-4 w-4" />
              Import
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </ContextMenuItem>
          {doc.isContainer !== true && (
            <ContextMenuItem onSelect={handleCut}>
              <Scissors className="mr-2 h-4 w-4" />
              Cut
            </ContextMenuItem>
          )}
          {doc.isContainer === true && (
            <>
              <ContextMenuItem onSelect={handleCut}>
                <Scissors className="mr-2 h-4 w-4" />
                Cut
              </ContextMenuItem>
              <ContextMenuItem
                className={cn(!canPaste && 'opacity-50 cursor-not-allowed')}
                onSelect={canPaste ? handlePaste : undefined}
                disabled={!canPaste}
              >
                <Clipboard className="mr-2 h-4 w-4" />
                Paste
              </ContextMenuItem>
            </>
          )}
          <ContextMenuItem onSelect={handleDuplicate}>
            <CopyPlus className="mr-2 h-4 w-4" />
            Duplicate
          </ContextMenuItem>
          <ContextMenuSeparator />
          {doc.isContainer !== true &&
            (doc.isFavorite ? (
              <>
                <ContextMenuItem onSelect={handleRemoveFromFavorites}>
                  <Star className={cn('mr-2 h-4 w-4', 'fill-amber-400')} />
                  Remove from Favorites
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            ) : (
              <>
                <ContextMenuItem onSelect={handleAddToFavorites}>
                  <Star className={cn('mr-2 h-4 w-4')} />
                  Add to Favorites
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            ))}
          <ContextMenuItem variant="destructive" onSelect={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      )}
      {/* Hidden file input for import */}
      {doc.isContainer === true && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      )}
    </ContextMenu>
  );
}
