'use client';

import * as React from 'react';
import {
  ChevronRight,
  Star,
  PencilLine,
  Repeat2,
  Settings2,
  Copy,
  Scissors,
  CopyPlus,
  Trash2,
  Clipboard as ClipboardIcon,
  FolderClosed,
  FolderPlus,
  BriefcaseMedical,
  FolderOutput,
  FolderInput,
} from '@repo/ui/components/icons';
import { DynamicIcon } from '@repo/ui/components/dynamic-icon';
import { cn } from '@repo/ui/lib/utils';
import { SpaceItemProps, SpaceData } from './types';
import { useActions, useSelector } from '@/store';
import { toast } from 'sonner';
import { IconPicker } from '@repo/ui/components/icon-picker';
import { Input } from '@repo/ui/components/input';
import { SidebarMenuButton } from '@repo/ui/components/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@repo/ui/components/collapsible';
import { SidebarMenuItem, SidebarMenuSub } from '@repo/ui/components/sidebar';
import {
  useRenameSpaceMutation,
  useUpdateSpaceIconMutation,
  useSpaceFavoritesMutation,
  useCreateSpaceMutation,
  useCreateContainerSpaceMutation,
  useDeleteSpaceMutation,
  useCopySpaceMutation,
  useMoveSpaceMutation,
  useDuplicateSpaceMutation,
  getAllSpacesQueryOptions,
  ListSpaceResult,
  useExportSpaceMutation,
  useImportSpaceMutation,
} from '@/queries/spaces';
import { alert } from '../alert';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@repo/ui/components/context-menu';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { getSiblings, sortByPosition, generatePositionKeyBetween } from '@repo/lib/utils/position';
import { addSpaceToCache, isSpaceCached } from '@/queries/caches/spaces';
import { queryClient } from '@/App';

export function SpaceItem({
  space,
  children,
  isExpanded,
  depth = 0,
  openMenuSpaceId,
  onSelectSpace,
  onToggleExpanded,
  onOpenContextMenu,
  onCloseContextMenu,
  onCloseSwitcher,
  setIsManageDisabled,
  setCanCloseDropdown,
  onInsertPlaceholder,
  onRemovePlaceholder,
  placeholderClientId,
}: Omit<SpaceItemProps, 'isActive' | 'isAncestor'> & {
  onCloseContextMenu: () => void;
  onCloseSwitcher: () => void;
}) {
  const isContainer = Boolean(space.isContainer);

  if (isContainer) {
    return (
      <ContainerSpaceItem
        space={space}
        children={children ?? []}
        isExpanded={isExpanded}
        depth={depth}
        openMenuSpaceId={openMenuSpaceId}
        onToggleExpanded={onToggleExpanded}
        onOpenContextMenu={onOpenContextMenu}
        onCloseContextMenu={onCloseContextMenu}
        onCloseSwitcher={onCloseSwitcher}
        setIsManageDisabled={setIsManageDisabled}
        setCanCloseDropdown={setCanCloseDropdown}
        onInsertPlaceholder={onInsertPlaceholder}
        onRemovePlaceholder={onRemovePlaceholder}
        placeholderClientId={placeholderClientId}
      />
    );
  }

  return (
    <RegularSpaceItem
      space={space}
      depth={depth}
      openMenuSpaceId={openMenuSpaceId}
      onSelectSpace={onSelectSpace}
      onOpenContextMenu={onOpenContextMenu}
      onCloseContextMenu={onCloseContextMenu}
      onCloseSwitcher={onCloseSwitcher}
      setIsManageDisabled={setIsManageDisabled}
      setCanCloseDropdown={setCanCloseDropdown}
      onInsertPlaceholder={onInsertPlaceholder}
      onRemovePlaceholder={onRemovePlaceholder}
      placeholderClientId={placeholderClientId}
    />
  );
}

function ContainerSpaceItem({
  space,
  children,
  isExpanded,
  onToggleExpanded,
  onCloseContextMenu,
  onCloseSwitcher,
  setIsManageDisabled,
  setCanCloseDropdown,
  onInsertPlaceholder,
  onRemovePlaceholder,
  placeholderClientId,
}: {
  space: SpaceData;
  children: SpaceItemProps[];
  isExpanded: boolean;
  depth?: number;
  openMenuSpaceId: string | null;
  onToggleExpanded: (spaceId: string) => void;
  onOpenContextMenu: (spaceId: string) => void;
  onCloseContextMenu: () => void;
  onCloseSwitcher: () => void;
  setIsManageDisabled?: (disabled: boolean) => void;
  setCanCloseDropdown?: (canClose: boolean) => void;
  onInsertPlaceholder?: (params: {
    parentId: string | null;
    type: 'space' | 'folder';
    name?: string;
  }) => void;
  onRemovePlaceholder?: () => void;
  placeholderClientId?: string | null;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isIconPickerOpen, setIsIconPickerOpen] = React.useState(false);
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [renameName, setRenameName] = React.useState(space.name);
  const renameInputRef = React.useRef<HTMLInputElement>(null);
  const isCreating = space.id === space.clientId;
  const { updateSpaceName, isPending: isRenamingPending } = useRenameSpaceMutation();
  const { updateSpaceIcon: updateIcon } = useUpdateSpaceIconMutation();
  // Favorites not used in container context menu
  const { setSpacesClipboard } = useActions();
  const clipboardSpace = useSelector((state) => state.spacesClipboard);
  const canPaste =
    !!clipboardSpace &&
    (clipboardSpace.type === 'copy' || clipboardSpace.type === 'move') &&
    clipboardSpace.space.id !== space.id;
  const createContainerSpaceMutation = useCreateContainerSpaceMutation({
    from: 'sidebar',
  });
  const duplicateSpaceMutation = useDuplicateSpaceMutation({
    space: space as any,
  });
  const copySpaceMutation = useCopySpaceMutation(space as any);
  const moveSpaceMutation = useMoveSpaceMutation(space as any);
  const deleteSpaceMutation = useDeleteSpaceMutation({ space: space as any });
  const contextMenuContentRef = React.useRef<HTMLDivElement>(null);

  const isPlaceholder = space.id === 'new-space';
  const [placeholderName, setPlaceholderName] = React.useState(space.name);
  const placeholderInputRef = React.useRef<HTMLInputElement>(null);
  const { mutate: exportSpace, isPending: isExportingSpace } = useExportSpaceMutation(
    space.id,
    space.name,
  );
  const importSpaceMutation = useImportSpaceMutation(space.id, null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const insertPlaceholderHandler = React.useCallback(
    (params: { type: 'space' | 'folder'; name?: string }) => {
      onInsertPlaceholder?.({
        parentId: space.id,
        type: params.type,
        name: params.name,
      });
    },
    [onInsertPlaceholder, space.id],
  );

  const removePlaceholderHandler = React.useCallback(() => {
    onRemovePlaceholder?.();
  }, [onRemovePlaceholder]);

  const isAncestor = useSelector((state) =>
    state.activeSpace?.path.map((p) => p.id).includes(space.id),
  );
  const isActive = useSelector((state) => state.activeSpace?.id === space.id);
  const isCutThisSpace = clipboardSpace?.type === 'move' && clipboardSpace.space.id === space.id;
  const highlightAsAncestorCollapsed = isAncestor && !isExpanded;

  const handleIconChange = (newIcon: string) => {
    try {
      updateIcon(space.id, newIcon);
    } catch {
      toast.error('Failed to update space icon');
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
        const popoverContent = document.querySelector('[data-slot="popover-content"]');

        if (popoverContent && !popoverContent.contains(event.target)) {
          // Also check if clicking on the icon button that opened this picker
          const iconButton = event.target.closest('button');
          const isIconButton = iconButton && iconButton.closest(`[data-space-id="${space.id}"]`);

          if (!isIconButton) {
            setIsIconPickerOpen(false);
          }
        }
      }
    };

    if (isIconPickerOpen) {
      // Use click instead of mousedown to avoid closing on hover
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
    return undefined;
  }, [isIconPickerOpen, space.id]);

  const handleRename = () => {
    setIsRenaming(true);
    setRenameName(space.name);
  };

  const handleRenameSubmit = async () => {
    if (isRenamingPending) return;
    if (renameName.trim() && renameName.trim() !== space.name) {
      try {
        await updateSpaceName(space.id, renameName.trim());
      } catch {
        toast.error('Failed to rename space');
        setRenameName(space.name); // Reset on error
      }
    }
    setIsRenaming(false);
  };

  const handleRenameCancel = () => {
    setIsRenaming(false);
    setRenameName(space.name);
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
      setIsManageDisabled?.(true);
      setTimeout(() => {
        if (renameInputRef.current) {
          renameInputRef.current.focus();
          renameInputRef.current.select();
        }
      }, 100);
    } else {
      setIsManageDisabled?.(false);
    }
  }, [isRenaming, setIsManageDisabled]);

  // Control dropdown close behavior based on renaming or placeholder state
  React.useEffect(() => {
    if (isRenaming || isPlaceholder) {
      setCanCloseDropdown?.(false);
    } else {
      setCanCloseDropdown?.(true);
    }
  }, [isRenaming, isPlaceholder, setCanCloseDropdown]);

  // Reset placeholder when the actual space is created
  React.useLayoutEffect(() => {
    if (
      space.id !== 'new-space' &&
      space.clientId &&
      placeholderClientId &&
      space.clientId === placeholderClientId
    ) {
      removePlaceholderHandler();
    }
  }, [space.id, space.clientId, placeholderClientId, removePlaceholderHandler]);

  // Highlight and scroll newly created container spaces
  React.useEffect(() => {
    const el = document.querySelector(`[data-space-id="${space.id}"]`) as HTMLElement | null;
    if (!el) return;
    if (isCreating) {
      el.classList.add('flash-highlight');
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      el.classList.remove('flash-highlight');
    }
    return () => {
      el.classList.remove('flash-highlight');
    };
  }, [space.id, isCreating]);

  // Handle click outside to save - only when actually clicking, not just hovering
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isRenaming &&
        renameInputRef.current &&
        !renameInputRef.current.contains(event.target as Node)
      ) {
        // Only save if clicking on a space item or navigation element
        const target = event.target as Element;
        const isSpaceItem = target.closest('[data-space-id]');
        const isNavigationElement = target.closest('button, [role="button"], a, [data-command]');

        // Only dismiss if clicking on a different space item (not the current one being renamed)
        // or on navigation elements
        if (
          isNavigationElement ||
          (isSpaceItem && isSpaceItem.getAttribute('data-space-id') !== space.id)
        ) {
          handleRenameSubmit();
        }
      }
    };

    if (isRenaming) {
      // Use click instead of mousedown to avoid triggering on hover
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
    return undefined;
  }, [isRenaming, renameName]);

  const beginInlineCreate = (type: 'space' | 'folder') => {
    if (!isExpanded) onToggleExpanded(space.id);
    insertPlaceholderHandler({ type });
  };

  const submitPlaceholder = () => {
    const name = placeholderName.trim();
    if (!isPlaceholder) return;
    if (!name) {
      removePlaceholderHandler();
      return;
    }
    // This is a container placeholder: create folder under its parent

    createContainerSpaceMutation.mutate(
      {
        parentId: space.parentId,
        spaceId: null,
        name,
        clientId: (space.clientId as string) ?? crypto.randomUUID(),
      },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
            removePlaceholderHandler();
            if (old) {
              if (!isSpaceCached(data?.clientId as string)) {
                addSpaceToCache(data?.clientId as string);
                return [...old, data];
              }
            }
            return old;
          });
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

  const handleCreateChildSpace = () => beginInlineCreate('space');
  const handleCreateChildFolder = () => beginInlineCreate('folder');
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

    // Get current spaces to calculate position
    const currentSpaces = queryClient.getQueryData(
      getAllSpacesQueryOptions.queryKey,
    ) as ListSpaceResult;
    if (!currentSpaces) {
      toast.error('Unable to get current spaces');
      return;
    }

    // Get siblings (spaces with the same parentId)
    const siblings = getSiblings(currentSpaces, space.id);
    const sortedSiblings = sortByPosition(siblings);

    // Calculate new position after the last sibling
    let newPosition: string;
    if (sortedSiblings.length === 0) {
      newPosition = 'a0';
    } else {
      const lastPosition = sortedSiblings.at(-1)?.position ?? null;
      newPosition = generatePositionKeyBetween(lastPosition, null);
    }

    importSpaceMutation.mutate({
      file,
      position: newPosition,
    });

    // Reset file input
    event.target.value = '';
  };

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

  return (
    <SidebarMenuItem>
      <Collapsible
        className="group/collapsible [&[data-state=open]>span>button>svg:first-child]:rotate-90"
        open={isExpanded}
        onOpenChange={() => onToggleExpanded(space.id)}
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
            className="group/space flex relative"
          >
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                data-space-id={space.id}
                isActive={isActive}
                className={cn(
                  'relative py-1.5 text-sm select-none overflow-hidden group-hover/space:!pr-16',
                  'group-hover/space:bg-sidebar-accent group-hover/space:text-sidebar-accent-foreground',
                  {
                    'bg-muted border border-dashed border-border/60': isCutThisSpace,
                    '!text-foreground': isActive,
                    '!pr-16': isActive,
                    'bg-accent/60': highlightAsAncestorCollapsed,
                  },
                )}
              >
                <ChevronRight className="transition-transform" />

                <div className="flex items-center justify-center p-1 hover:bg-accent/50 rounded-sm">
                  <DynamicIcon name={space.icon || 'folder-closed'} className="size-4" />
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
                    disabled={
                      createContainerSpaceMutation.isPending ||
                      createContainerSpaceMutation.isSuccess
                    }
                  />
                ) : isRenaming ? (
                  <Input
                    ref={(el) => {
                      renameInputRef.current = el;
                      if (el && !el.dataset.focused) {
                        // Only focus and select once when input first appears
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
                    disabled={isRenamingPending}
                    className="h-6 text-sm text-foreground px-1 py-0 border-0 bg-transparent focus-visible:border-0 focus-visible:ring-0 focus-visible:outline-none shadow-none flex-1 min-w-0 [&:focus]:border-0 [&:focus]:ring-0 [&:focus]:outline-none "
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span title={space.name} className="truncate text-sm min-w-0 flex-1">
                    {space.name}
                  </span>
                )}
              </SidebarMenuButton>
            </CollapsibleTrigger>
            {!isPlaceholder && !isCreating && (
              <div
                className={cn(
                  'items-center hidden group-hover/space:flex absolute top-0 right-0 shrink-0',
                  {
                    flex: isActive && !isCreating,
                  },
                )}
              >
                <button
                  className="px-1 py-2 text-muted-foreground hovert:text-foreground group/control-item"
                  title="Add child space"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCreateChildSpace();
                  }}
                >
                  <BriefcaseMedical className="size-4 group-hover/control-item:text-foreground" />
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
              <>
                <IconPicker
                  value={space.icon || 'folder-closed'}
                  onValueChange={handleIconChange}
                  inPlace
                  searchable
                />
              </>
            ) : (
              <>
                <ContextMenuItem className="group" onSelect={() => beginInlineCreate('space')}>
                  <BriefcaseMedical className="mr-2 h-4 w-4" />
                  Create Child Space
                </ContextMenuItem>
                <ContextMenuItem className="group" onSelect={() => beginInlineCreate('folder')}>
                  <FolderClosed className="mr-2 h-4 w-4" />
                  Create Child Folder
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
                  onSelect={() => exportSpace()}
                  disabled={isExportingSpace}
                  className="group"
                >
                  <FolderOutput className="mr-2 h-4 w-4 group-hover:text-foreground" /> Export Space
                </ContextMenuItem>
                <ContextMenuItem
                  onSelect={handleImport}
                  disabled={importSpaceMutation.isPending}
                  className="group"
                >
                  <FolderInput className="mr-2 h-4 w-4 group-hover:text-foreground" />
                  Import Space
                </ContextMenuItem>
                <ContextMenuItem
                  className="group"
                  onSelect={() => {
                    window.document.body.style.pointerEvents = '';
                    navigate({
                      to: '/spaces/manage',
                      search: { item: space.id },
                    });
                    onCloseSwitcher();
                  }}
                >
                  <Settings2 className="mr-2 h-4 w-4 group-hover:text-foreground" />
                  Manage
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  className="group"
                  onSelect={() => setSpacesClipboard(space as any, 'copy')}
                >
                  <Copy className="mr-2 h-4 w-4 group-hover:text-foreground" />
                  Copy
                </ContextMenuItem>
                <ContextMenuItem
                  className="group"
                  onSelect={() => setSpacesClipboard(space as any, 'move')}
                >
                  <Scissors className="mr-2 h-4 w-4 group-hover:text-foreground" />
                  Cut
                </ContextMenuItem>
                <ContextMenuItem
                  className={`group ${!canPaste ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onSelect={
                    canPaste
                      ? () => {
                          if (!clipboardSpace) return;
                          if (!isExpanded) onToggleExpanded(space.id);
                          const expandAndScrollToEnd = () => {
                            try {
                              setTimeout(
                                () => {
                                  const container = document.querySelector(
                                    `[data-space-children-of="${space.id}"]`,
                                  ) as HTMLElement | null;
                                  if (!container) return;
                                  const last = container.lastElementChild as HTMLElement | null;
                                  if (last)
                                    last.scrollIntoView({
                                      behavior: 'smooth',
                                      block: 'nearest',
                                    });
                                },
                                clipboardSpace.type === 'copy' ? 150 : 0,
                              );
                            } catch {
                              // ignore scroll errors
                            }
                          };
                          if (clipboardSpace.type === 'move') {
                            moveSpaceMutation.mutate(undefined as any, {
                              onSuccess: expandAndScrollToEnd,
                            });
                          } else {
                            copySpaceMutation.mutate(undefined as any, {
                              onSuccess: expandAndScrollToEnd,
                            });
                          }
                        }
                      : undefined
                  }
                  disabled={!canPaste}
                >
                  <ClipboardIcon className="mr-2 h-4 w-4 group-hover:text-foreground" />
                  Paste
                </ContextMenuItem>
                <ContextMenuItem className="group" onSelect={() => duplicateSpaceMutation.mutate()}>
                  <CopyPlus className="mr-2 h-4 w-4 group-hover:text-foreground" />
                  Duplicate
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  className="group focus:bg-destructive/10 text-destructive hover:text-destructive focus:text-destructive"
                  onSelect={() => {
                    alert({
                      title: `Delete Folder: ${space.name}`,
                      description:
                        'Are you sure you want to delete this folder? deleting this folder will also delete all of its children.',
                      confirmText: 'Delete',
                      cancelText: 'Cancel',
                      onConfirm: () => deleteSpaceMutation.mutate({ spaceId: space.id }),
                      buttonVariant: 'destructive',
                    });
                  }}
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
            <SidebarMenuSub className="mr-0 pr-0" data-space-children-of={space.id}>
              {children &&
                children.length > 0 &&
                children.map((childProps) => (
                  <SpaceItem
                    key={childProps.space.id}
                    {...childProps}
                    onCloseContextMenu={onCloseContextMenu}
                    onCloseSwitcher={onCloseSwitcher}
                  />
                ))}
            </SidebarMenuSub>
          )}
        </CollapsibleContent>
      </Collapsible>
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </SidebarMenuItem>
  );
}

function RegularSpaceItem({
  space,
  onSelectSpace,
  onCloseSwitcher,
  setIsManageDisabled,
  setCanCloseDropdown,
  onRemovePlaceholder,
  placeholderClientId,
}: {
  space: SpaceData;
  depth?: number;
  openMenuSpaceId: string | null;
  onSelectSpace: (spaceId: string) => void;
  onOpenContextMenu: (spaceId: string) => void;
  onCloseContextMenu: () => void;
  onCloseSwitcher: () => void;
  setIsManageDisabled?: (disabled: boolean) => void;
  setCanCloseDropdown?: (canClose: boolean) => void;
  onInsertPlaceholder?: (params: {
    parentId: string | null;
    type: 'space' | 'folder';
    name?: string;
  }) => void;
  onRemovePlaceholder?: () => void;
  placeholderClientId?: string | null;
}) {
  const navigate = useNavigate();
  const [isIconPickerOpen, setIsIconPickerOpen] = React.useState(false);
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [renameName, setRenameName] = React.useState(space.name);
  const renameInputRef = React.useRef<HTMLInputElement>(null);

  const { updateSpaceName, isPending: isRenamingPending } = useRenameSpaceMutation();
  const { updateSpaceIcon: updateIcon } = useUpdateSpaceIconMutation();
  const { addToFavorites, removeFromFavorites } = useSpaceFavoritesMutation();
  const createSpaceMutation = useCreateSpaceMutation({ from: 'sidebar' });
  const isActive = useSelector((state) => state.activeSpace?.id === space.id);
  const isCreating = space.id === (space.clientId ?? '');
  const { setSpacesClipboard } = useActions();
  const deleteSpaceMutation = useDeleteSpaceMutation({ space: space as any });
  const duplicateSpaceMutationRegular = useDuplicateSpaceMutation({
    space: space as any,
  });
  const contextMenuContentRef = React.useRef<HTMLDivElement>(null);
  const clipboardSpaceRegular = useSelector((state) => state.spacesClipboard);
  const isCutThisSpaceRegular =
    clipboardSpaceRegular?.type === 'move' && clipboardSpaceRegular.space.id === space.id;

  const isPlaceholder = space.id === 'new-space' && !space.isContainer;
  const [placeholderName, setPlaceholderName] = React.useState(space.name);
  const placeholderInputRef = React.useRef<HTMLInputElement>(null);
  const { mutate: exportSpace, isPending: isExportingSpace } = useExportSpaceMutation(
    space.id,
    space.name,
  );

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
    createSpaceMutation.mutate(
      {
        parentId: space.parentId ?? null,
        spaceId: null,
        name,
        clientId: (space.clientId as string) ?? crypto.randomUUID(),
      },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(
            getAllSpacesQueryOptions.queryKey,
            (old: ListSpaceResult | undefined) => {
              removePlaceholderHandler();
              if (old) {
                if (!isSpaceCached(data?.clientId as string)) {
                  addSpaceToCache(data?.clientId as string);
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

  const handleIconChange = async (newIcon: string) => {
    try {
      await updateIcon(space.id, newIcon);
    } catch {
      toast.error('Failed to update space icon');
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

  // Highlight and scroll when creating
  React.useEffect(() => {
    const el = document.querySelector(`[data-space-id="${space.id}"]`) as HTMLElement | null;
    if (!el) return;
    if (isCreating) {
      el.classList.add('flash-highlight');
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      el.classList.remove('flash-highlight');
    }
    return () => {
      el.classList.remove('flash-highlight');
    };
  }, [space.id, isCreating]);

  // Close picker when clicking elsewhere
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isIconPickerOpen && event.target instanceof Element) {
        // Check if click is outside the popover content
        const popoverContent = document.querySelector('[data-slot="popover-content"]');

        if (popoverContent && !popoverContent.contains(event.target)) {
          // Also check if clicking on the icon button that opened this picker
          const iconButton = event.target.closest('button');
          const isIconButton = iconButton && iconButton.closest(`[data-space-id="${space.id}"]`);

          if (!isIconButton) {
            setIsIconPickerOpen(false);
          }
        }
      }
    };

    if (isIconPickerOpen) {
      // Use click instead of mousedown to avoid closing on hover
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
    return undefined;
  }, [isIconPickerOpen, space.id]);

  const handleRename = () => {
    setIsRenaming(true);
    setRenameName(space.name);
  };

  const handleRenameSubmit = async () => {
    if (renameName.trim() && renameName.trim() !== space.name) {
      try {
        await updateSpaceName(space.id, renameName.trim());
      } catch {
        toast.error('Failed to rename space');
        setRenameName(space.name); // Reset on error
      }
    }
    setIsRenaming(false);
  };

  const handleRenameCancel = () => {
    setIsRenaming(false);
    setRenameName(space.name);
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
      setIsManageDisabled?.(true);
      setTimeout(() => {
        if (renameInputRef.current) {
          renameInputRef.current.focus();
          renameInputRef.current.select();
        }
      }, 100);
    } else {
      setIsManageDisabled?.(false);
    }
  }, [isRenaming, setIsManageDisabled]);

  // Control dropdown close behavior based on renaming or placeholder state
  React.useEffect(() => {
    if (isRenaming || isPlaceholder) {
      setCanCloseDropdown?.(false);
    } else {
      setCanCloseDropdown?.(true);
    }
  }, [isRenaming, isPlaceholder, setCanCloseDropdown]);

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

  // Reset placeholder when the actual space is created
  React.useLayoutEffect(() => {
    if (
      space.id !== 'new-space' &&
      space.clientId &&
      placeholderClientId &&
      space.clientId === placeholderClientId
    ) {
      removePlaceholderHandler();
    }
  }, [space.id, space.clientId, placeholderClientId, removePlaceholderHandler]);

  // Handle click outside to save - only when actually clicking, not just hovering
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isRenaming &&
        renameInputRef.current &&
        !renameInputRef.current.contains(event.target as Node)
      ) {
        // Only save if clicking on a space item or navigation element
        const target = event.target as Element;
        const isSpaceItem = target.closest('[data-space-id]');
        const isNavigationElement = target.closest('button, [role="button"], a, [data-command]');

        // Only dismiss if clicking on a different space item (not the current one being renamed)
        // or on navigation elements
        if (
          isNavigationElement ||
          (isSpaceItem && isSpaceItem.getAttribute('data-space-id') !== space.id)
        ) {
          handleRenameSubmit();
        }
      }
    };

    if (isRenaming) {
      // Use click instead of mousedown to avoid triggering on hover
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
    return undefined;
  }, [isRenaming, renameName]);

  // Regular items no longer expose add-child from context menu

  return (
    <SidebarMenuItem>
      <ContextMenu
        onOpenChange={(open) => {
          if (open) {
            setIsIconPickerOpen(false);
          }
        }}
      >
        <ContextMenuTrigger disabled={isCreating || isPlaceholder} asChild>
          <SidebarMenuButton
            data-space-id={space.id}
            isActive={isActive}
            className={cn(
              'relative flex w-full items-center gap-2 cursor-pointer !py-0 text-sm select-none overflow-hidden rounded-sm',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              {
                'bg-muted border border-dashed border-border/60': isCutThisSpaceRegular,
                'text-foreground!': isActive,
              },
            )}
            onClick={() => {
              if (isCreating || isPlaceholder) return; // disable switching while creating
              onSelectSpace(space.id);
              onCloseSwitcher();
            }}
          >
            <div className="flex items-center justify-center p-1 hover:bg-accent/50 rounded-sm">
              <DynamicIcon
                name={space.icon || 'briefcase'}
                className="size-4 group-hover:text-foreground"
              />
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
                disabled={createSpaceMutation.isPending || createSpaceMutation.isSuccess}
                className="h-6 text-sm text-foreground px-1 py-0 border-0 bg-transparent focus-visible:border-0 focus-visible:ring-0 focus-visible:outline-none shadow-none flex-1 min-w-0 [&:focus]:border-0 [&:focus]:ring-0 [&:focus]:outline-none"
                onClick={(e) => e.stopPropagation()}
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
                disabled={isRenamingPending}
                className="h-6 text-sm text-foreground px-1 py-0 border-0 bg-transparent focus-visible:border-0 focus-visible:ring-0 focus-visible:outline-none shadow-none flex-1 min-w-0 [&:focus]:border-0 [&:focus]:ring-0 [&:focus]:outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate min-w-0 flex-1">{space.name}</span>
            )}
          </SidebarMenuButton>
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
            <>
              <IconPicker
                value={space.icon || 'folder-closed'}
                onValueChange={handleIconChange}
                inPlace
                searchable
              />
            </>
          ) : (
            <>
              {' '}
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
                disabled={isExportingSpace}
                onSelect={() => {
                  exportSpace();
                }}
              >
                <FolderOutput className="mr-2 h-4 w-4 group-hover:text-foreground" /> Export
              </ContextMenuItem>
              <ContextMenuItem
                className="group"
                onSelect={() => {
                  window.document.body.style.pointerEvents = '';
                  navigate({
                    to: '/spaces/manage',
                    search: { item: space.id },
                  });
                  onCloseSwitcher();
                }}
              >
                <Settings2 className="mr-2 h-4 w-4 group-hover:text-foreground" />
                Manage
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                className="group"
                onSelect={() => setSpacesClipboard(space as any, 'copy')}
              >
                <Copy className="mr-2 h-4 w-4 group-hover:text-foreground" />
                Copy
              </ContextMenuItem>
              <ContextMenuItem
                className="group"
                onSelect={() => setSpacesClipboard(space as any, 'move')}
              >
                <Scissors className="mr-2 h-4 w-4 group-hover:text-foreground" />
                Cut
              </ContextMenuItem>
              <ContextMenuItem
                className="group"
                onSelect={() => {
                  duplicateSpaceMutationRegular.mutate();
                }}
              >
                <CopyPlus className="mr-2 h-4 w-4 group-hover:text-foreground" />
                Duplicate
              </ContextMenuItem>
              <ContextMenuSeparator />
              {space.isFavorite ? (
                <ContextMenuItem className="group" onSelect={() => removeFromFavorites(space.id)}>
                  <Star className="mr-2 h-4 w-4 group-hover:text-foreground fill-amber-400" />
                  Remove from Favorites
                </ContextMenuItem>
              ) : (
                <ContextMenuItem className="group" onSelect={() => addToFavorites(space.id)}>
                  <Star className="mr-2 h-4 w-4 group-hover:text-foreground" />
                  Add to Favorites
                </ContextMenuItem>
              )}
              <ContextMenuSeparator />
              <ContextMenuItem
                className="group focus:bg-destructive/10 text-destructive hover:text-destructive focus:text-destructive"
                onSelect={() => {
                  const isFolder = Boolean(space.isContainer);
                  alert({
                    title: isFolder
                      ? `Delete Folder: ${space.name}`
                      : `Delete Space: ${space.name}`,
                    description: isFolder
                      ? 'Are you sure you want to delete this folder? deleting this folder will also delete all of its children.'
                      : 'Are you sure you want to delete this space? This action cannot be undone.',
                    confirmText: 'Delete',
                    cancelText: 'Cancel',
                    onConfirm: () => deleteSpaceMutation.mutate({ spaceId: space.id }),
                    buttonVariant: 'destructive',
                  });
                }}
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
