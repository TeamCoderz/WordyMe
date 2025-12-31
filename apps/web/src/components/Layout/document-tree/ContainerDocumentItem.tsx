'use client';

import * as React from 'react';
import {
  ChevronRight,
  FilePlus,
  FolderPlus,
  PencilLine,
  Repeat2,
  Settings2,
  Trash2,
  Copy,
  Clipboard,
  Scissors,
  CopyPlus,
  FolderOutput,
} from '@repo/ui/components/icons';
import { DynamicIcon } from '@repo/ui/components/dynamic-icon';
import { cn } from '@repo/ui/lib/utils';
import { DocumentData } from './types';
import { useSelector, useActions } from '@/store';
import { IconPicker } from '@repo/ui/components/icon-picker';
import { Input } from '@repo/ui/components/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@repo/ui/components/collapsible';
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  useSidebar,
} from '@repo/ui/components/sidebar';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  useRenameDocumentMutation,
  useUpdateDocumentIconMutation,
  useDeleteDocumentMutation,
  useDuplicateDocumentMutation,
  useCopyDocumentMutation,
  useMoveDocumentMutation,
  useCreateContainerDocumentMutation,
  useExportDocumentMutation,
  getAllDocumentsQueryOptions,
  ListDocumentResult,
} from '@/queries/documents';
import { alert } from '../alert';
import { cachedDocuments, isDocumentCached } from '@/queries/caches/documents';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@repo/ui/components/context-menu';

interface ContainerDocumentItemProps {
  document: DocumentData;
  children: React.ReactNode;
  isExpanded: boolean;
  isAncestor?: boolean;
  depth?: number;
  openMenuDocumentId: string | null;
  onSelectDocument: (documentId: string) => void;
  onToggleExpanded: (documentId: string) => void;
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

export function ContainerDocumentItem({
  document,
  children,
  isExpanded,
  isAncestor,
  onToggleExpanded,
  onInsertPlaceholder,
  onRemovePlaceholder,
  placeholderClientId,
}: ContainerDocumentItemProps) {
  // Export document mutation
  const exportDocumentMutation = useExportDocumentMutation(document.id, document.name);
  const [isIconPickerOpen, setIsIconPickerOpen] = React.useState(false);
  const navigate = useNavigate();
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [renameName, setRenameName] = React.useState(document.name);
  const renameInputRef = React.useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  // Note: container items are not links; click toggles expand/collapse
  const isCreating = document.id === document.clientId;
  const { isMobile: isMobileSidebar, setOpenMobile } = useSidebar();
  const isActive = useSelector((state) => state.activeDocument?.id === document.id);
  const contextMenuContentRef = React.useRef<HTMLDivElement>(null);
  const highlightAsAncestorCollapsed = !!isAncestor && !isExpanded;

  // Use the rename document mutation
  const { updateDocumentName, isPending: isRenamingPending } = useRenameDocumentMutation({
    document: document as any, // Cast to match ListDocumentResult type
  });

  // Use the update document icon mutation
  const { updateDocumentIcon } = useUpdateDocumentIconMutation({
    document: document as any, // Cast to match ListDocumentResult type
  });

  const createFolderMutation = useCreateContainerDocumentMutation({
    document: document,
    from: 'sidebar',
  });

  // Use the delete document mutation
  const deleteDocumentMutation = useDeleteDocumentMutation({
    document: document as any, // Cast to match ListDocumentResult type
  });

  // Use the duplicate document mutation
  const duplicateDocumentMutation = useDuplicateDocumentMutation({
    document: document as any,
  });

  // Use the copy document mutation
  const copyDocumentMutation = useCopyDocumentMutation(document as any);

  // Use the move document mutation
  const moveDocumentMutation = useMoveDocumentMutation(document as any);

  // Clipboard state management
  const { setDocumentsClipboard } = useActions();
  const clipboardDocument = useSelector((state) => state.documentsClipboard);
  const isCutThisItem =
    clipboardDocument?.type === 'move' && clipboardDocument.document.id === document.id;
  const inlineCreate = useSelector((state) => state.inlineCreate);
  const { clearInlineCreate } = useActions();

  const isPlaceholder = document.id === 'new-doc';
  const [placeholderName, setPlaceholderName] = React.useState(document.name);
  const placeholderInputRef = React.useRef<HTMLInputElement>(null);

  const insertPlaceholderHandler = React.useCallback(
    (params: { type: 'note' | 'folder'; name?: string }) => {
      onInsertPlaceholder?.({
        parentId: document.id,
        type: params.type,
        name: params.name,
      });
    },
    [onInsertPlaceholder, document.id],
  );

  const removePlaceholderHandler = React.useCallback(() => {
    onRemovePlaceholder?.();
  }, [onRemovePlaceholder]);

  const beginInlineCreate = (type: 'note' | 'folder') => {
    if (!isExpanded) onToggleExpanded(document.id);
    insertPlaceholderHandler({ type });
  };

  const submitPlaceholder = () => {
    const name = placeholderName.trim();
    if (!isPlaceholder) return;
    if (!name) {
      removePlaceholderHandler();
      return;
    }
    createFolderMutation.mutate(
      {
        parentId: document.parentId,
        spaceId: document.spaceId,
        name,
        clientId: document.clientId as string,
      },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(
            getAllDocumentsQueryOptions(document.spaceId!).queryKey,
            (old: ListDocumentResult) => {
              removePlaceholderHandler();
              if (old) {
                // Check if document is already in cache to avoid duplicates

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
      },
    );
  };

  const cancelPlaceholder = () => {
    if (!isPlaceholder) return;
    removePlaceholderHandler();
  };

  const handleCreateChildNote = () => beginInlineCreate('note');

  const handleDelete = () => {
    alert({
      title: `Delete Folder: ${document.name}`,
      description: `Are you sure you want to delete this folder? deleting this folder will also delete all of its children.`,
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

  const handleCreateChildFolder = () => beginInlineCreate('folder');

  const handleCopy = () => {
    setDocumentsClipboard(document as any, 'copy');
  };

  const handleCut = () => {
    setDocumentsClipboard(document as any, 'move');
  };

  const handlePaste = () => {
    if (!clipboardDocument) return;
    // Ensure the folder is expanded immediately
    if (!isExpanded) onToggleExpanded(document.id);
    const expandAndScrollToEnd = () => {
      try {
        const delay = clipboardDocument?.type === 'copy' ? 150 : 0;
        setTimeout(() => {
          const container = window.document.querySelector(
            `[data-children-of="${document.id}"]`,
          ) as HTMLElement | null;
          if (!container) return;
          const last = container.lastElementChild as HTMLElement | null;
          if (last) {
            last.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } else {
            container.scrollTop = container.scrollHeight;
          }
        }, delay);
      } catch {
        // ignore errors during scroll/expand
      }
    };
    if (clipboardDocument.type === 'move') {
      moveDocumentMutation.mutate(undefined as any, {
        onSuccess: expandAndScrollToEnd,
      });
    } else {
      copyDocumentMutation.mutate(undefined as any, {
        onSuccess: expandAndScrollToEnd,
      });
    }
  };

  const handleDuplicate = () => {
    duplicateDocumentMutation.mutate();
  };

  const canPaste =
    !!clipboardDocument &&
    (clipboardDocument.type === 'copy' || clipboardDocument.type === 'move') &&
    clipboardDocument.document.id !== document.id;

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

  const handleRenameSubmit = () => {
    if (isRenamingPending) return;
    if (renameName.trim() && renameName.trim() !== document.name) {
      try {
        updateDocumentName(document.id, renameName.trim());
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

  // Scroll and highlight if this is a newly created container (client_id matches id)
  React.useEffect(() => {
    const el = window.document.querySelector(
      `[data-document-id="${document.id}"]`,
    ) as HTMLElement | null;
    if (!el) return;
    if (isCreating) {
      el.classList.add('flash-highlight');
      if (cachedDocuments.get(document.id) === 'sidebar') {
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

  // Focus the placeholder input when present
  React.useEffect(() => {
    if (isPlaceholder && placeholderInputRef.current) {
      const el = placeholderInputRef.current;
      setTimeout(() => {
        el?.focus();
        el?.select();
      }, 100);
    }
  }, [isPlaceholder]);

  // Respond to global inlineCreate triggers for this parent
  React.useEffect(() => {
    if (!inlineCreate) return;
    const isForThisParent = inlineCreate.parentId === document.id;
    if (isForThisParent) {
      if (!isExpanded) onToggleExpanded(document.id);
      insertPlaceholderHandler({
        type: inlineCreate.type,
        name: inlineCreate.name,
      });
      clearInlineCreate();
    }
  }, [
    inlineCreate,
    document.id,
    isExpanded,
    onToggleExpanded,
    insertPlaceholderHandler,
    clearInlineCreate,
  ]);

  return (
    <SidebarMenuItem>
      <Collapsible
        className="group/collapsible [&[data-state=open]>span>button>svg:first-child]:rotate-90"
        open={isExpanded}
        onOpenChange={() => onToggleExpanded(document.id)}
      >
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
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                data-document-id={document.id}
                isActive={isActive}
                className={cn(
                  'relative py-1.5 text-sm select-none overflow-hidden group-hover/document:!pr-16',
                  'group-hover/document:!bg-sidebar-accent/50 group-hover/document:text-sidebar-accent-foreground',
                  {
                    'bg-muted border border-dashed border-border/60': isCutThisItem,
                    '!text-foreground': isActive,
                    '!pr-16': isActive,
                    ' !text-foreground !pr-16 !bg-sidebar-accent group-hover/document:!bg-sidebar-accent':
                      highlightAsAncestorCollapsed,
                  },
                )}
              >
                <ChevronRight className="transition-transform" />

                <div className="flex items-center justify-center p-0.5 rounded-sm">
                  <DynamicIcon name={document.icon || 'file'} className="size-4" />
                </div>
                {isPlaceholder ? (
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
                    className="h-6 text-sm text-foreground px-1 py-0 border-0 bg-transparent focus-visible:border-0 focus-visible:ring-0 focus-visible:outline-none shadow-none flex-1 min-w-0 [&:focus]:border-0 [&:focus]:ring-0 [&:focus]:outline-none"
                    onClick={(e) => e.stopPropagation()}
                    disabled={createFolderMutation.isPending || createFolderMutation.isSuccess}
                  />
                ) : isRenaming ? (
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
                    onClick={(e) => e.stopPropagation()}
                    disabled={isRenamingPending}
                  />
                ) : (
                  <span title={document.name} className="truncate text-sm flex-1 min-w-0">
                    {document.name}
                  </span>
                )}
              </SidebarMenuButton>
            </CollapsibleTrigger>
            {!isPlaceholder && !isCreating && (
              <div
                className={cn(
                  'items-center hidden group-hover/document:flex absolute top-0 right-0 shrink-0',
                  {
                    flex: isActive && !isCreating,
                  },
                )}
              >
                <button
                  className="px-1 py-2 text-muted-foreground hovert:text-foreground group/control-item"
                  title="Add child note"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCreateChildNote();
                  }}
                >
                  <FilePlus className="size-4 group-hover/control-item:text-foreground" />
                </button>
                <button
                  className="p-2 text-muted-foreground group/control-item"
                  title="Add child folder"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCreateChildFolder();
                  }}
                >
                  <FolderPlus className="size-4 group-hover/control-item:text-foreground" />
                </button>
              </div>
            )}
          </ContextMenuTrigger>
          <ContextMenuContent
            className="p-2"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              return;
            }}
            ref={contextMenuContentRef}
          >
            {isIconPickerOpen ? (
              <IconPicker
                value={document.icon || 'file'}
                onValueChange={handleIconChange}
                inPlace
                searchable
              />
            ) : (
              <>
                <ContextMenuItem className="group" onSelect={handleCreateChildNote}>
                  <FilePlus className="mr-2 h-4 w-4 group-hover:text-foreground" />
                  Add Child Note
                </ContextMenuItem>
                <ContextMenuItem className="group" onSelect={handleCreateChildFolder}>
                  <FolderPlus className="mr-2 h-4 w-4 group-hover:text-foreground" />
                  Add Child Folder
                </ContextMenuItem>
                <ContextMenuSeparator />
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
                  <FolderOutput className="mr-2 h-4 w-4 group-hover:text-foreground" />
                  Export Folder
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
                <ContextMenuItem className="group" onSelect={handleCopy}>
                  <Copy className="mr-2 h-4 w-4 group-hover:text-foreground" />
                  Copy
                </ContextMenuItem>
                <ContextMenuItem className="group" onSelect={handleCut}>
                  <Scissors className="mr-2 h-4 w-4 group-hover:text-foreground" />
                  Cut
                </ContextMenuItem>
                <ContextMenuItem
                  className={`group ${!canPaste ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onSelect={canPaste ? handlePaste : undefined}
                  disabled={!canPaste}
                >
                  <Clipboard className="mr-2 h-4 w-4 group-hover:text-foreground" />
                  Paste
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

        <CollapsibleContent>
          {isExpanded && (
            <SidebarMenuSub className="mr-0 pr-0 gap-0.5" data-children-of={document.id}>
              {children}
            </SidebarMenuSub>
          )}
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}
