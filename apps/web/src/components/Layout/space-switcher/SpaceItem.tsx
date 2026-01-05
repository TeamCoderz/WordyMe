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
import { InputGroup, InputGroupAddon, InputGroupInput } from '@repo/ui/components/input-group';
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
import { dispatchEscapeKey } from '@/utils/keyboard';
import { set } from 'zod';

interface SpaceNameInputProps {
  space: SpaceData;
  mode: 'placeholder' | 'renaming';
  onRemovePlaceholder?: () => void;
  onRenameComplete?: () => void;
  setIsManageDisabled?: (disabled: boolean) => void;
  setCanCloseDropdown?: (canClose: boolean) => void;
  placeholderClientId?: string | null;
  isContainer?: boolean;
}

function SpaceNameInput({
  space,
  mode,
  onRemovePlaceholder,
  onRenameComplete,
  setIsManageDisabled,
  setCanCloseDropdown,
  isContainer = false,
}: SpaceNameInputProps) {
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = React.useState(space.name);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Mutations
  const { updateSpaceName, isPending: isRenamingPending } = useRenameSpaceMutation();
  const createContainerSpaceMutation = useCreateContainerSpaceMutation({
    from: 'sidebar',
  });
  const createSpaceMutation = useCreateSpaceMutation({ from: 'sidebar' });

  const isPlaceholder = mode === 'placeholder';
  const isRenaming = mode === 'renaming';

  // Handle placeholder submission
  const submitPlaceholder = React.useCallback(() => {
    if (!isPlaceholder) return;
    const name = inputValue.trim();
    if (!name) {
      onRemovePlaceholder?.();
      return;
    }

    const mutation = isContainer ? createContainerSpaceMutation : createSpaceMutation;
    mutation.mutate(
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
              onRemovePlaceholder?.();
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
          onRemovePlaceholder?.();
        },
      },
    );
  }, [
    isPlaceholder,
    inputValue,
    isContainer,
    space.parentId,
    space.clientId,
    createContainerSpaceMutation,
    createSpaceMutation,
    queryClient,
    onRemovePlaceholder,
  ]);

  // Handle rename submission
  const submitRename = React.useCallback(async () => {
    if (!isRenaming || isRenamingPending) return;
    if (inputValue.trim() && inputValue.trim() !== space.name) {
      try {
        await updateSpaceName(space.id, inputValue.trim());
      } catch {
        toast.error('Failed to rename space');
        setInputValue(space.name); // Reset on error
      }
    }
    onRenameComplete?.();
  }, [
    isRenaming,
    isRenamingPending,
    inputValue,
    space.id,
    space.name,
    updateSpaceName,
    onRenameComplete,
  ]);

  // Handle cancel
  const handleCancel = React.useCallback(() => {
    if (isPlaceholder) {
      onRemovePlaceholder?.();
    } else if (isRenaming) {
      setInputValue(space.name);
      onRenameComplete?.();
    }
  }, [isPlaceholder, isRenaming, space.name, onRemovePlaceholder, onRenameComplete]);

  // Handle keyboard events
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        if (isPlaceholder) {
          submitPlaceholder();
        } else {
          submitRename();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    },
    [isPlaceholder, submitPlaceholder, submitRename, handleCancel],
  );

  // Handle blur
  const handleBlur = React.useCallback(() => {
    if (isPlaceholder) {
      submitPlaceholder();
    } else {
      submitRename();
    }
  }, [isPlaceholder, submitPlaceholder, submitRename]);

  // Focus management
  React.useEffect(() => {
    if (isRenaming || isPlaceholder) {
      setIsManageDisabled?.(true);
      setCanCloseDropdown?.(false);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 100);
      return () => {
        setIsManageDisabled?.(false);
        setCanCloseDropdown?.(true);
      };
    }
    return undefined;
  }, [isRenaming, isPlaceholder, setIsManageDisabled, setCanCloseDropdown]);

  // Handle click outside to save
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        (isRenaming || isPlaceholder) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        const target = event.target as Element;
        const isSpaceItem = target.closest('[data-space-id]');
        const isNavigationElement = target.closest('button, [role="button"], a, [data-command]');

        if (
          isNavigationElement ||
          (isSpaceItem && isSpaceItem.getAttribute('data-space-id') !== space.id)
        ) {
          if (isPlaceholder) {
            submitPlaceholder();
          } else {
            submitRename();
          }
        }
      }
    };

    if (isRenaming || isPlaceholder) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
    return undefined;
  }, [isRenaming, isPlaceholder, space.id, submitPlaceholder, submitRename]);

  const isPending =
    (isPlaceholder &&
      (isContainer
        ? createContainerSpaceMutation.isPending || createContainerSpaceMutation.isSuccess
        : createSpaceMutation.isPending || createSpaceMutation.isSuccess)) ||
    (isRenaming && isRenamingPending);

  return (
    <InputGroup className="w-full ring-0!" onClick={(e) => e.stopPropagation()}>
      {isContainer && (
        <InputGroupAddon align="inline-start">
          <ChevronRight className="transition-transform size-4" />
        </InputGroupAddon>
      )}
      <InputGroupAddon align="inline-start">
        <DynamicIcon
          name={space.icon || (isContainer ? 'folder-closed' : 'briefcase')}
          className="size-4"
        />
      </InputGroupAddon>
      <InputGroupInput
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onKeyUp={(e) => e.stopPropagation()}
        onKeyPress={(e) => e.stopPropagation()}
        onBlur={handleBlur}
        disabled={isPending}
        className="h-6 text-sm"
      />
    </InputGroup>
  );
}

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
  const isCreating = space.id === space.clientId;
  const { updateSpaceIcon: updateIcon } = useUpdateSpaceIconMutation();
  // Favorites not used in container context menu
  const { setSpacesClipboard } = useActions();
  const clipboardSpace = useSelector((state) => state.spacesClipboard);
  const canPaste =
    !!clipboardSpace &&
    (clipboardSpace.type === 'copy' || clipboardSpace.type === 'move') &&
    clipboardSpace.space.id !== space.id;
  const duplicateSpaceMutation = useDuplicateSpaceMutation({
    space: space as any,
  });
  const copySpaceMutation = useCopySpaceMutation(space as any);
  const moveSpaceMutation = useMoveSpaceMutation(space as any);
  const deleteSpaceMutation = useDeleteSpaceMutation({ space: space as any });
  const contextMenuContentRef = React.useRef<HTMLDivElement>(null);

  const isPlaceholder = space.id === 'new-space';
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
  }, [isPlaceholder, space.id, space.clientId, placeholderClientId, removePlaceholderHandler]);

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
  };

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

  const beginInlineCreate = (type: 'space' | 'folder') => {
    if (!isExpanded) onToggleExpanded(space.id);
    insertPlaceholderHandler({ type });
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

  // Return SpaceNameInput directly for placeholder or renaming mode
  if (isPlaceholder || isRenaming) {
    return (
      <SidebarMenuItem>
        <SpaceNameInput
          space={space}
          mode={isPlaceholder ? 'placeholder' : 'renaming'}
          onRemovePlaceholder={removePlaceholderHandler}
          onRenameComplete={isRenaming ? () => setIsRenaming(false) : undefined}
          setIsManageDisabled={setIsManageDisabled}
          setCanCloseDropdown={setCanCloseDropdown}
          placeholderClientId={placeholderClientId}
          isContainer={true}
        />
      </SidebarMenuItem>
    );
  }

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
                <span title={space.name} className="truncate text-sm min-w-0 flex-1">
                  {space.name}
                </span>
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
                <ContextMenuItem
                  className="group"
                  onSelect={() => {
                    dispatchEscapeKey();
                    setTimeout(() => {
                      beginInlineCreate('space');
                    }, 0);
                  }}
                >
                  <BriefcaseMedical className="mr-2 h-4 w-4" />
                  Create Child Space
                </ContextMenuItem>
                <ContextMenuItem
                  className="group"
                  onSelect={() => {
                    dispatchEscapeKey();
                    setTimeout(() => {
                      beginInlineCreate('folder');
                    }, 0);
                  }}
                >
                  <FolderClosed className="mr-2 h-4 w-4" />
                  Create Child Folder
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  className="group"
                  onSelect={() => {
                    dispatchEscapeKey();
                    setTimeout(handleRename, 0);
                  }}
                >
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
  const { updateSpaceIcon: updateIcon } = useUpdateSpaceIconMutation();
  const { addToFavorites, removeFromFavorites } = useSpaceFavoritesMutation();
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
  const { mutate: exportSpace, isPending: isExportingSpace } = useExportSpaceMutation(
    space.id,
    space.name,
  );

  const removePlaceholderHandler = React.useCallback(() => {
    onRemovePlaceholder?.();
  }, [onRemovePlaceholder]);

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
  }, [isPlaceholder, space.id, space.clientId, placeholderClientId, removePlaceholderHandler]);

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
  };

  // Regular items no longer expose add-child from context menu

  // Return SpaceNameInput directly for placeholder or renaming mode
  if (isPlaceholder || isRenaming) {
    return (
      <SidebarMenuItem>
        <SpaceNameInput
          space={space}
          mode={isPlaceholder ? 'placeholder' : 'renaming'}
          onRemovePlaceholder={removePlaceholderHandler}
          onRenameComplete={isRenaming ? () => setIsRenaming(false) : undefined}
          setIsManageDisabled={setIsManageDisabled}
          setCanCloseDropdown={setCanCloseDropdown}
          isContainer={false}
        />
      </SidebarMenuItem>
    );
  }

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
            <span className="truncate min-w-0 flex-1">{space.name}</span>
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
              <ContextMenuItem
                className="group"
                onSelect={() => {
                  dispatchEscapeKey();
                  setTimeout(handleRename, 0);
                }}
              >
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
