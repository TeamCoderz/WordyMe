'use client';

import * as React from 'react';
import { DynamicIcon } from '@repo/ui/components/dynamic-icon';
import { cn } from '@repo/ui/lib/utils';
import { DocumentData } from './types';
import { useSelector, useActions } from '@/store';
import { IconPicker } from '@repo/ui/components/icon-picker';
import { Input } from '@repo/ui/components/input';
import {
  useRenameDocumentMutation,
  useUpdateDocumentIconMutation,
  useDocumentFavoritesMutation,
  useDeleteDocumentMutation,
  useCreateDocumentMutation,
  useExportDocumentMutation,
  getAllDocumentsQueryOptions,
  ListDocumentResult,
} from '@/queries/documents';
import { alert } from '../alert';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  PencilLine,
  Repeat2,
  Settings2,
  Trash2,
  Star,
  Copy,
  Scissors,
  CopyPlus,
  SquarePen,
  FileOutput,
} from '@repo/ui/components/icons';
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from '@repo/ui/components/sidebar';
import { cachedDocuments, isDocumentCached } from '@/queries/caches/documents';
import { useDuplicateDocumentMutation } from '@/queries/documents';
import { useQueryClient } from '@tanstack/react-query';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@repo/ui/components/context-menu';

interface RegularDocumentItemProps {
  document: DocumentData;
  depth?: number;
  openMenuDocumentId: string | null;
  onSelectDocument: (documentId: string) => void;
  onOpenContextMenu: (documentId: string) => void;
  onCloseContextMenu: () => void;
  onInsertPlaceholder?: (params: {
    parentId: string | null;
    type: 'note' | 'folder';
    name?: string;
  }) => void;
  onRemovePlaceholder?: () => void;
  placeholderClientId?: string | null;
}

export function RegularDocumentItem({
  document,
  onSelectDocument,
  onCloseContextMenu,
  onRemovePlaceholder,
  placeholderClientId,
}: RegularDocumentItemProps) {
  // Export document mutation
  const exportDocumentMutation = useExportDocumentMutation(document.id, document.name);
  const queryClient = useQueryClient();
  const [isIconPickerOpen, setIsIconPickerOpen] = React.useState(false);
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [renameName, setRenameName] = React.useState(document.name);
  const renameInputRef = React.useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const isActive = useSelector((state) => state.activeDocument?.id === document.id);
  const clipboardDocument = useSelector((state) => state.documentsClipboard);
  const isCutThisItem =
    clipboardDocument?.type === 'move' && clipboardDocument.document.id === document.id;
  const isCreating = document.id === document.clientId;

  const { isMobile: isMobileSidebar, setOpenMobile } = useSidebar();
  const contextMenuContentRef = React.useRef<HTMLDivElement>(null);

  // Use the rename document mutation
  const { updateDocumentName, isPending: isRenamingPending } = useRenameDocumentMutation({
    document: document as any, // Cast to match ListDocumentResult type
  });

  // Use the update document icon mutation
  const { updateDocumentIcon } = useUpdateDocumentIconMutation({
    document: document as any, // Cast to match ListDocumentResult type
  });

  // Use the document favorites mutation
  const { addToDocumentFavorites, removeDocumentFromFavorites } = useDocumentFavoritesMutation({
    document: document as any, // Cast to match ListDocumentResult type
  });

  // Use the delete document mutation
  const deleteDocumentMutation = useDeleteDocumentMutation({
    document: document as any, // Cast to match ListDocumentResult type
  });

  // Use the duplicate document mutation
  const duplicateDocumentMutation = useDuplicateDocumentMutation({
    document: document as any,
  });

  const createDocumentMutation = useCreateDocumentMutation({
    document: document as any,
    from: 'sidebar',
  });

  // Clipboard state management
  const { setDocumentsClipboard } = useActions();
  const isPlaceholder = document.id === 'new-doc' && !document.isContainer;
  const [placeholderName, setPlaceholderName] = React.useState(document.name);
  const placeholderInputRef = React.useRef<HTMLInputElement>(null);

  const removePlaceholderHandler = React.useCallback(() => {
    onRemovePlaceholder?.();
  }, [onRemovePlaceholder]);

  const submitPlaceholder = () => {
    if (!isPlaceholder) return;
    const name = placeholderName.trim();
    if (!name) {
      removePlaceholderHandler();
      return;
    }
    createDocumentMutation.mutate(
      {
        parentId: document.parentId ?? null,
        spaceId: document.spaceId,
        name,
        clientId: document.clientId as string,
      },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(
            getAllDocumentsQueryOptions(document.spaceId!).queryKey,
            (old: ListDocumentResult): ListDocumentResult => {
              removePlaceholderHandler();
              if (old) {
                // Check if document is already in cache to avoid duplicates
                if (!isDocumentCached(data?.clientId as string) && data) {
                  const { currentRevision, ...document } = data;
                  let newDocument: ListDocumentResult[number] = {
                    ...document,
                    currentRevisionId: currentRevision?.id ?? null,
                  };
                  return [...old, newDocument];
                }
              }
              return old;
            },
          );
        },
        onError: () => {
          removePlaceholderHandler();
        },
      },
    );
  };

  const cancelPlaceholder = () => {
    if (!isPlaceholder) return;
    removePlaceholderHandler();
  };

  const handleDelete = () => {
    alert({
      title: `Delete Document: ${document.name}`,
      description: `Are you sure you want to delete this document? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await deleteDocumentMutation.mutateAsync({ documentId: document.id });
        } catch (error) {
          // Error handling is done in the mutation
        }
      },
      buttonVariant: 'destructive',
    });
  };

  const handleCopy = () => {
    setDocumentsClipboard(document as any, 'copy');
  };

  const handleCut = () => {
    setDocumentsClipboard(document as any, 'move');
  };

  const handleDuplicate = () => {
    duplicateDocumentMutation.mutate();
  };

  const handleIconChange = (newIcon: string) => {
    try {
      updateDocumentIcon(document.id, newIcon);
    } catch {
      // Error handling is done in the mutation
    } finally {
      contextMenuContentRef.current?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          code: 'Escape',
          keyCode: 27,
          bubbles: true,
          cancelable: true,
        }),
      );
    }
  };

  // Close picker when clicking elsewhere
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isIconPickerOpen && event.target instanceof Element) {
        // Check if click is outside the popover content
        const popoverContent = window.document.querySelector('[data-slot="popover-content"]');

        if (popoverContent && !popoverContent.contains(event.target)) {
          // Also check if clicking on the icon button that opened this picker
          const iconButton = event.target.closest('button');
          const isIconButton =
            iconButton && iconButton.closest(`[data-document-id="${document.id}"]`);

          if (!isIconButton) {
            setIsIconPickerOpen(false);
          }
        }
      }
    };

    if (isIconPickerOpen) {
      // Use click instead of mousedown to avoid closing on hover
      window.document.addEventListener('click', handleClickOutside);
      return () => window.document.removeEventListener('click', handleClickOutside);
    }
    return undefined;
  }, [isIconPickerOpen, document.id]);

  const handleRename = () => {
    setIsRenaming(true);
    setRenameName(document.name);
  };

  const handleRenameSubmit = async () => {
    if (renameName.trim() && renameName.trim() !== document.name) {
      try {
        await updateDocumentName(document.id, renameName.trim());
        setIsRenaming(false);
      } catch {
        // Error handling is done in the mutation
        setRenameName(document.name); // Reset on error
        setIsRenaming(false);
      }
    } else {
      setIsRenaming(false);
    }
  };

  const handleRenameCancel = () => {
    setIsRenaming(false);
    setRenameName(document.name);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleRenameCancel();
    }
  };

  // Reset placeholder when the actual document is created
  React.useLayoutEffect(() => {
    if (
      document.id !== 'new-doc' &&
      document.clientId &&
      placeholderClientId &&
      document.clientId === placeholderClientId
    ) {
      removePlaceholderHandler();
    }
  }, [document.id, document.clientId, placeholderClientId, removePlaceholderHandler]);

  // Focus input when entering rename mode
  React.useEffect(() => {
    if (isRenaming) {
      setTimeout(() => {
        if (renameInputRef.current) {
          renameInputRef.current.focus();
          renameInputRef.current.select();
        }
      }, 100);
    }
  }, [isRenaming]);

  // Focus placeholder input when present
  React.useEffect(() => {
    if (isPlaceholder && placeholderInputRef.current) {
      const el = placeholderInputRef.current;
      setTimeout(() => {
        el?.focus();
        el?.select();
      }, 100);
    }
  }, [isPlaceholder]);

  // While this item is newly created (id === client_id), keep it highlighted; otherwise remove
  React.useEffect(() => {
    const el = window.document.querySelector(
      `[data-document-id="${document.id}"]`,
    ) as HTMLElement | null;
    if (!el) return;
    if (isCreating) {
      el.classList.add('flash-highlight');

      if (cachedDocuments.get(document.clientId ?? '') === 'sidebar') {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else {
      el.classList.remove('flash-highlight');
    }
    return () => {
      el.classList.remove('flash-highlight');
    };
  }, [isCreating]);

  // Handle click outside to save - only when actually clicking, not just hovering
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isRenaming &&
        renameInputRef.current &&
        !renameInputRef.current.contains(event.target as Node)
      ) {
        // Only save if clicking on a document item or navigation element
        const target = event.target as Element;
        const isDocumentItem = target.closest('[data-document-id]');
        const isNavigationElement = target.closest('button, [role="button"], a, [data-command]');

        // Only dismiss if clicking on a different document item (not the current one being renamed)
        // or on navigation elements
        if (
          isNavigationElement ||
          (isDocumentItem && isDocumentItem.getAttribute('data-document-id') !== document.id)
        ) {
          handleRenameSubmit();
        }
      }
    };

    if (isRenaming) {
      // Use click instead of mousedown to avoid triggering on hover
      window.document.addEventListener('click', handleClickOutside);
      return () => window.document.removeEventListener('click', handleClickOutside);
    }
    return undefined;
  }, [isRenaming, renameName]);

  return (
    <SidebarMenuItem>
      <ContextMenu
        onOpenChange={(open) => {
          if (open) {
            setIsIconPickerOpen(false);
          }
        }}
      >
        <ContextMenuTrigger
          disabled={isCreating || isPlaceholder}
          className="group/document flex relative"
        >
          <SidebarMenuButton
            data-document-id={document.id}
            isActive={isActive}
            className={cn(
              'relative flex w-full items-center gap-2 cursor-pointer !py-0 text-sm select-none overflow-hidden rounded-sm',
              'group-hover/document:!bg-sidebar-accent/50 group-hover/document:text-sidebar-accent-foreground group-hover/document:!pr-8',
              {
                'bg-muted border border-dashed border-border/60': isCutThisItem,
                '!text-foreground !pr-8 !bg-sidebar-accent group-hover/document:!bg-sidebar-accent':
                  isActive,
              },
            )}
            asChild
          >
            {isCreating ? (
              <div
                className="flex items-center gap-2 flex-1 min-w-0 basis-0 px-2 py-1.5 opacity-80"
                data-document-id={document.id}
              >
                <div className="flex items-center justify-center p-0.5 rounded-sm">
                  <DynamicIcon name={document.icon || 'file'} className="size-4" />
                </div>
                <span className="truncate flex-1 min-w-0">{document.name}</span>
              </div>
            ) : isPlaceholder ? (
              <div
                className="flex items-center gap-2 flex-1 min-w-0 basis-0 px-2 py-1.5"
                data-document-id={document.id}
              >
                <div className="flex items-center justify-center p-0.5 hover:bg-accent/50 rounded-sm">
                  <DynamicIcon name={document.icon || 'file'} className="size-4" />
                </div>
                <Input
                  ref={placeholderInputRef}
                  value={placeholderName}
                  onChange={(e) => setPlaceholderName(e.target.value)}
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
                  onKeyUp={(e) => e.stopPropagation()}
                  onKeyPress={(e) => e.stopPropagation()}
                  onBlur={submitPlaceholder}
                  disabled={createDocumentMutation.isPending || createDocumentMutation.isSuccess}
                  className="h-6 text-sm text-foreground px-1 py-0 border-0 bg-transparent focus-visible:border-0 focus-visible:ring-0 focus-visible:outline-none shadow-none flex-1 min-w-0 [&:focus]:border-0 [&:focus]:ring-0 [&:focus]:outline-none"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                />
              </div>
            ) : isRenaming ? (
              <div
                className="flex items-center gap-2 flex-1 min-w-0 basis-0 px-2 py-1.5"
                data-document-id={document.id}
              >
                <div className="flex items-center justify-center p-0.5 hover:bg-accent/50 rounded-sm">
                  <DynamicIcon name={document.icon || 'file'} className="size-4" />
                </div>
                <Input
                  ref={(el) => {
                    renameInputRef.current = el;
                    if (el && !el.dataset.focused) {
                      el.dataset.focused = 'true';
                      setTimeout(() => {
                        el.focus();
                        el.select();
                      }, 100);
                    }
                  }}
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    handleRenameKeyDown(e);
                  }}
                  onKeyUp={(e) => e.stopPropagation()}
                  onKeyPress={(e) => e.stopPropagation()}
                  onBlur={handleRenameSubmit}
                  className="h-6 text-sm text-foreground px-1 py-0 border-0 bg-transparent focus-visible:border-0 focus-visible:ring-0 focus-visible:outline-none shadow-none flex-1 min-w-0 [&:focus]:border-0 [&:focus]:ring-0 [&:focus]:outline-none"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  disabled={isRenamingPending}
                />
              </div>
            ) : (
              <Link
                className="flex items-center gap-2 flex-1 min-w-0 basis-0 px-2 py-1.5"
                to="/view/$handle"
                params={{ handle: document.handle ?? document.id }}
                data-document-id={document.id}
                onClick={() => {
                  if (isMobileSidebar) {
                    setOpenMobile(false);
                  }
                  onSelectDocument(document.id);
                }}
              >
                <div className="flex items-center justify-center p-0.5 hover:bg-accent/50 rounded-sm">
                  <DynamicIcon name={document.icon || 'file'} className="size-4" />
                </div>
                <span className="truncate flex-1 min-w-0">{document.name}</span>
              </Link>
            )}
          </SidebarMenuButton>
          <div
            className={cn(
              'items-center hidden group-hover/document:flex max-md:flex absolute top-0 right-0 shrink-0',
              {
                flex: isActive && !isCreating,
              },
            )}
          >
            {!isPlaceholder && !isCreating && (
              <Link
                className="p-2 text-muted-foreground hovert:text-foreground group/control-item"
                to="/edit/$handle"
                params={{ handle: document.handle ?? document.id }}
              >
                <SquarePen className="size-4 group-hover/control-item:text-foreground" />
              </Link>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent
          className="p-2"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            onCloseContextMenu();
            return;
          }}
          ref={contextMenuContentRef}
        >
          {isIconPickerOpen ? (
            <>
              <IconPicker
                value={document.icon || 'file'}
                onValueChange={handleIconChange}
                inPlace
                searchable
                onFocus={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              />
            </>
          ) : (
            <>
              <ContextMenuItem className="group" onSelect={handleRename}>
                <PencilLine className="mr-2 h-4 w-4 group-hover:text-foreground" />
                Rename
              </ContextMenuItem>
              <ContextMenuItem
                className="group"
                onSelect={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsIconPickerOpen(true);
                }}
              >
                <Repeat2 className="mr-2 h-4 w-4 group-hover:text-foreground" />
                Change Icon
              </ContextMenuItem>
              <ContextMenuItem
                className="group"
                onSelect={() => {
                  exportDocumentMutation.mutate();
                }}
                disabled={exportDocumentMutation.isPending}
              >
                <FileOutput className="mr-2 h-4 w-4 group-hover:text-foreground" />
                Export Document
              </ContextMenuItem>
              <ContextMenuItem
                className="group"
                onSelect={() => {
                  window.document.body.style.pointerEvents = '';
                  navigate({
                    to: '/docs/manage',
                    search: { item: document.id },
                  });
                  if (isMobileSidebar) {
                    setOpenMobile(false);
                  }
                }}
              >
                <Settings2 className="mr-2 h-4 w-4 group-hover:text-foreground" />
                Manage
              </ContextMenuItem>
              <ContextMenuSeparator />
              {document.isFavorite ? (
                <ContextMenuItem
                  className="group"
                  onSelect={() => removeDocumentFromFavorites(document.id)}
                >
                  <Star className="mr-2 h-4 w-4 group-hover:text-foreground fill-amber-400" />
                  Remove from Favorites
                </ContextMenuItem>
              ) : (
                <ContextMenuItem
                  className="group"
                  onSelect={() => addToDocumentFavorites(document.id)}
                >
                  <Star className="mr-2 h-4 w-4 group-hover:text-foreground" />
                  Add to Favorites
                </ContextMenuItem>
              )}
              <ContextMenuSeparator />
              <ContextMenuItem className="group" onSelect={handleCopy}>
                <Copy className="mr-2 h-4 w-4 group-hover:text-foreground" />
                Copy
              </ContextMenuItem>
              <ContextMenuItem className="group" onSelect={handleCut}>
                <Scissors className="mr-2 h-4 w-4 group-hover:text-foreground" />
                Cut
              </ContextMenuItem>
              <ContextMenuItem className="group" onSelect={handleDuplicate}>
                <CopyPlus className="mr-2 h-4 w-4 group-hover:text-foreground" />
                Duplicate
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                className="group focus:bg-destructive/10 text-destructive hover:text-destructive focus:text-destructive"
                onSelect={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4 group-focus:!text-destructive" />
                Delete
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </SidebarMenuItem>
  );
}
