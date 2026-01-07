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
  Copy,
  Clipboard,
  Scissors,
  FolderClosed,
  BriefcaseMedical,
  CopyPlus,
  FolderOutput,
  FolderInput,
} from '@repo/ui/components/icons';

import FocusLock from 'react-focus-lock';
// no-op import from headless-tree used elsewhere
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  useRenameSpaceMutation,
  useUpdateSpaceIconMutation,
  useCreateSpaceMutation,
  useCreateContainerSpaceMutation,
  useSpaceFavoritesMutation,
  useDeleteSpaceMutation,
  useCopySpaceMutation,
  useMoveSpaceMutation,
  useDuplicateSpaceMutation,
  useExportSpaceMutation,
  useImportSpaceMutation,
  ListSpaceResultItem,
  getAllSpacesQueryOptions,
  ListSpaceResult,
} from '@/queries/spaces';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { alert } from '@/components/Layout/alert';
import { useActions, useSelector } from '@/store';
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
import { useQueryClient } from '@tanstack/react-query';
import { generatePositionKeyBetween, getSiblings, sortByPosition } from '@repo/lib/utils/position';
import { isSpaceCached } from '@/queries/caches/spaces';
import { ItemInstance } from '@headless-tree/core';
import { TreeNode } from '@repo/lib/data/tree';

type SpaceTreeNode = TreeNode<ListSpaceResultItem>;
type SpaceTreeItem = ItemInstance<SpaceTreeNode | null>;

export interface ManageSpacesTableRowProps {
  item: SpaceTreeItem;
  index: number; // kept for future use if needed
  isLast: boolean;
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
  tree: ReturnType<typeof import('@headless-tree/react').useTree<SpaceTreeNode | null>>;
  getDescendantIds: (nodeId: string) => string[];
  onBeginInlineCreate?: (type: 'space' | 'folder') => void;
  onRemovePlaceholder?: () => void;
  placeholderClientId?: string;
}

function ManageSpacesTableRowComponent({
  item,
  isLast,
  draggingId,
  setDraggingId,
  tree,
  getDescendantIds,
  onBeginInlineCreate,
  onRemovePlaceholder,
  placeholderClientId,
}: ManageSpacesTableRowProps) {
  const itemData = item.getItemData() as SpaceTreeNode | null;
  const space = itemData?.data as
    | (ListSpaceResultItem & {
        clientId?: string | null;
      })
    | undefined;

  // Guard clause: component cannot function without a space
  if (!space) {
    return null;
  }

  const isCreating = space.id === space.clientId || space.id === 'new-space';
  const isPlaceholder = space.id === 'new-space';
  const [placeholderName, setPlaceholderName] = React.useState<string>(space.name ?? '');
  const placeholderInputRef = React.useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const isSubmittingPlaceholderRef = React.useRef<boolean>(false);
  const { setActiveSpaceBySpaceId, setSpacesClipboard } = useActions();
  const { updateSpaceName, isPending: isRenamePending } = useRenameSpaceMutation();
  const { updateSpaceIcon: updateIcon } = useUpdateSpaceIconMutation();
  const createSpaceMutation = useCreateSpaceMutation({
    from: 'manage',
  });
  const { addToFavorites, removeFromFavorites } = useSpaceFavoritesMutation();
  const copySpaceMutation = useCopySpaceMutation(space);
  const moveSpaceMutation = useMoveSpaceMutation(space);
  const createContainerSpaceMutation = useCreateContainerSpaceMutation({
    from: 'manage',
  });
  const clipboardSpace = useSelector((state) => state.spacesClipboard);
  const isCutThisItem =
    clipboardSpace?.type === 'move' && clipboardSpace.space.id === (space?.id ?? '');
  const [isRenaming, setIsRenaming] = React.useState(false);

  const [isMenuIconPickerOpen, setIsMenuIconPickerOpen] = React.useState(false);
  const [renameName, setRenameName] = React.useState<string>(item.getItemData()?.data.name ?? '');
  const renameInputRef = React.useRef<HTMLInputElement>(null);
  const dragImageRef = React.useRef<HTMLImageElement | null>(null);
  const deleteSpaceMutation = useDeleteSpaceMutation({ space });
  const duplicateSpaceMutation = useDuplicateSpaceMutation({ space });
  const exportSpaceMutation = useExportSpaceMutation(space?.id ?? '', space?.name);
  const importSpaceMutation = useImportSpaceMutation(space?.id ?? null, null);

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

  // Prepare a transparent drag image once
  React.useEffect(() => {
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
    dragImageRef.current = img;
  }, []);

  // Scroll into view when isCreating and from manage
  React.useEffect(() => {
    if (!isCreating || isPlaceholder) return;
    const createdFrom = (space as any).from;
    if (createdFrom === 'manage') {
      try {
        // Use setTimeout to ensure DOM is updated
        setTimeout(() => {
          const el = document.querySelector(
            `[data-manage-space-id="${space?.id ?? ''}"]`,
          ) as HTMLElement | null;
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 100);
      } catch (error) {
        console.error('Scroll error:', error);
      }
    }
  }, [isCreating, isPlaceholder, space?.id, space]);

  const handleRename = () => {
    setIsRenaming(true);
    setRenameName(space.name ?? '');
  };

  const handleRenameSubmit = async () => {
    if (isRenamePending) return;
    if (renameName.trim() && renameName.trim() !== space.name) {
      try {
        await updateSpaceName(space.id ?? '', renameName.trim());
      } catch {
        toast.error('Failed to rename space');
        setRenameName(space.name ?? ''); // Reset on error
      }
    }
    setIsRenaming(false);
  };

  const handleRenameCancel = () => {
    setIsRenaming(false);
    setRenameName(space.name ?? '');
  };

  const handleIconChange = async (newIcon: string) => {
    try {
      await updateIcon(space.id ?? '', newIcon);
    } catch {
      toast.error('Failed to update space icon');
    } finally {
      setIsMenuIconPickerOpen(false);
    }
  };
  const handleAddChildSpace = () => {
    if (!space?.id) return;
    // Expand the item first if it's not already expanded
    if (!item.isExpanded()) {
      if (typeof (item as any).setExpanded === 'function') {
        (item as any).setExpanded(true);
      } else if (typeof (item as any).expand === 'function') {
        (item as any).expand();
      }
    }
    if (onBeginInlineCreate) {
      onBeginInlineCreate('space');
    } else {
      createSpaceMutation.mutate({
        parentId: space.id,
        spaceId: null,
        clientId: crypto.randomUUID(),
      });
    }
  };
  const handleAddChildFolder = () => {
    if (!space?.id) return;
    // Expand the item first if it's not already expanded
    if (!item.isExpanded()) {
      if (typeof (item as any).setExpanded === 'function') {
        (item as any).setExpanded(true);
      } else if (typeof (item as any).expand === 'function') {
        (item as any).expand();
      }
    }
    if (onBeginInlineCreate) {
      onBeginInlineCreate('folder');
    } else {
      createContainerSpaceMutation.mutate({
        parentId: space.id,
        spaceId: null,
        clientId: crypto.randomUUID(),
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
    if (space.isContainer === true) {
      createContainerSpaceMutation.mutateAsync(
        {
          parentId: space.parentId ?? null,
          spaceId: null,
          name,
          clientId: space.clientId as string,
        },
        {
          onSuccess: (data) => {
            // Add to query cache if not already there
            queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
              removePlaceholderHandler();
              if (old) {
                if (!isSpaceCached(data?.clientId as string) && data) {
                  return [...old, data];
                }
              }
              return old;
            });
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
      createSpaceMutation.mutateAsync(
        {
          parentId: space.parentId ?? null,
          spaceId: null,
          name,
          clientId: space.clientId as string,
        },
        {
          onSuccess: (data) => {
            // Add to query cache if not already there
            queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
              removePlaceholderHandler();
              if (old) {
                if (!isSpaceCached(data?.clientId as string) && data) {
                  return [...old, data];
                }
              }
              return old;
            });
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

  // Reset placeholder when the actual space is created
  React.useLayoutEffect(() => {
    if (
      space?.id !== 'new-space' &&
      space?.clientId &&
      placeholderClientId &&
      space?.clientId === placeholderClientId
    ) {
      removePlaceholderHandler();
    }
  }, [space?.id, space?.clientId, placeholderClientId, removePlaceholderHandler]);
  const handleAddToFavorites = () => {
    if (!space?.id) return;
    addToFavorites(space.id);
  };
  const handleRemoveFromFavorites = () => {
    if (!space?.id) return;
    removeFromFavorites(space.id);
  };
  const handleDelete = () => {
    if (!space?.id) return;
    alert({
      title: space?.isContainer ? `Delete Folder: ${space.name}` : `Delete Space: ${space.name}`,
      description: space?.isContainer
        ? 'Are you sure you want to delete this folder? deleting this folder will also delete all of its children.'
        : 'Are you sure you want to delete this space? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: () => deleteSpaceMutation.mutate({ spaceId: space.id }),
      buttonVariant: 'destructive',
    });
  };

  const handleCopy = () => {
    if (!space?.id) return;
    setSpacesClipboard(space, 'copy');
    toast.success('Space copied to clipboard');
  };

  const handleCut = () => {
    if (!space?.id) return;
    setSpacesClipboard(space, 'move');
    toast.success('Space cut to clipboard');
  };

  const handleDuplicate = () => {
    if (!space?.id) return;
    duplicateSpaceMutation.mutate();
  };

  const handleExport = () => {
    if (!space?.id) return;
    exportSpaceMutation.mutate();
  };

  const handleImport = () => {
    if (!space?.id) return;

    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Calculate position at the end of children
      const currentSpaces = queryClient.getQueryData(
        getAllSpacesQueryOptions.queryKey,
      ) as ListSpaceResult;
      if (!currentSpaces) return;

      const siblings = getSiblings(currentSpaces, space.id);
      const sortedSiblings = sortByPosition(siblings);

      let position: string;
      if (sortedSiblings.length === 0) {
        position = 'a0';
      } else {
        const lastPosition = sortedSiblings.at(-1)?.position ?? null;
        position = generatePositionKeyBetween(lastPosition, null);
      }

      importSpaceMutation.mutate({ file, position });
    };
    input.click();
  };

  const handlePaste = () => {
    if (!clipboardSpace || !space?.id) return;
    // Expand the item first if it's not already expanded
    if (!item.isExpanded()) {
      if (typeof (item as any).setExpanded === 'function') {
        (item as any).setExpanded(true);
      } else if (typeof (item as any).expand === 'function') {
        (item as any).expand();
      }
    }
    if (clipboardSpace.type === 'move') {
      // Use move mutation for cut operation
      moveSpaceMutation.mutate();
    } else {
      // Use copy mutation for copy operation
      copySpaceMutation.mutate();
    }
  };
  const canPaste =
    !!clipboardSpace &&
    (clipboardSpace.type === 'copy' || clipboardSpace.type === 'move') &&
    clipboardSpace.space.id !== (space?.id ?? '');
  return (
    <ContextMenu>
      <ContextMenuTrigger disabled={isPlaceholder || isCreating}>
        <TreeItem
          key={item.getId()}
          item={item}
          asChild
          className="ps-0"
          onDragStartCapture={(e) => {
            const node = e.target as unknown as Node | null;
            const el =
              node && (node as any).nodeType === 1
                ? (node as unknown as Element)
                : node && (node as any).parentElement
                  ? ((node as any).parentElement as Element)
                  : null;
            if (!el) return;
            if (!el.closest('[data-drag-handle="true"]')) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          <div
            className={cn(
              `grid grid-cols-[minmax(16rem,2fr)_minmax(8rem,1fr)_minmax(10rem,1fr)_minmax(10rem,1fr)_auto] ps-0 gap-4 py-3 hover:bg-accent/50 group group/item`,
              !isLast && 'border-b border-dashed border-border/50',
              draggingId === item.getId() && 'opacity-50',
              typeof (item as any).isDragTarget === 'function' &&
                (item as any).isDragTarget() &&
                'bg-muted/50',
              isCutThisItem && 'bg-muted border border-dashed border-border/60',
              isCreating && !isPlaceholder && 'bg-accent/30',
            )}
          >
            <div className="flex items-center gap-2 text-foreground px-2 h-10">
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
                      // Use preconstructed transparent image to hide drag preview
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
              <div className="flex items-center gap-2 ps-[clamp(0px,var(--tree-padding),calc(var(--spacing)*32))]">
                <div className="flex items-center justify-center">
                  {(item.getItemData()?.data as any)?.isContainer === true ? (
                    <button
                      data-expand-toggle="true"
                      className="p-1 hover:bg-accent/50 rounded-sm"
                      aria-label={item.isExpanded() ? 'Collapse' : 'Expand'}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const isOpen =
                          typeof item.isExpanded === 'function' ? item.isExpanded() : false;
                        const items = typeof tree.getItems === 'function' ? tree.getItems() : [];
                        if (isOpen) {
                          // Collapse this item and all descendants
                          if (typeof (item as any).setExpanded === 'function') {
                            (item as any).setExpanded(false);
                          } else if (typeof (item as any).collapse === 'function') {
                            (item as any).collapse();
                          }
                          const ids = getDescendantIds(item.getId());
                          for (const id of ids) {
                            const child = items.find(
                              (it: any) => typeof it.getId === 'function' && it.getId() === id,
                            );
                            if (!child) continue;
                            if (typeof (child as any).setExpanded === 'function') {
                              (child as any).setExpanded(false);
                            } else if (typeof (child as any).collapse === 'function') {
                              (child as any).collapse();
                            }
                          }
                        } else {
                          // Expand this item
                          if (typeof (item as any).setExpanded === 'function') {
                            (item as any).setExpanded(true);
                          } else if (typeof (item as any).expand === 'function') {
                            (item as any).expand();
                          }
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
                  value={
                    space.icon ??
                    ((item.getItemData()?.data as any)?.isContainer === true
                      ? 'folder-closed'
                      : 'briefcase')
                  }
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
                  >
                    <DynamicIcon
                      className="size-4"
                      name={
                        space.icon ??
                        ((item.getItemData()?.data as any)?.isContainer === true
                          ? 'folder-closed'
                          : 'briefcase')
                      }
                    />
                  </button>
                </IconPicker>
                {isPlaceholder ? (
                  <Input
                    ref={placeholderInputRef}
                    data-placeholder-input="true"
                    value={placeholderName}
                    onChange={(e) => setPlaceholderName(e.target.value)}
                    onBlur={() => {
                      // Trigger placeholder submit on blur
                      submitPlaceholder();
                    }}
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
                    onClick={(e) => e.stopPropagation()}
                    className="h-6 text-sm px-1 py-0 border-0 bg-transparent focus-visible:border-0 focus-visible:ring-0 focus-visible:outline-none shadow-none flex-1 min-w-0 [&:focus]:border-0 [&:focus]:ring-0 [&:focus]:outline-none"
                    placeholder={space.isContainer === true ? 'New Folder' : 'New Space'}
                  />
                ) : isRenaming ? (
                  <FocusLock>
                    <Input
                      ref={renameInputRef}
                      data-rename-input="true"
                      value={renameName}
                      onChange={(e) => setRenameName(e.target.value)}
                      onBlur={() => {
                        // Trigger rename on blur to save changes when input loses focus
                        handleRenameSubmit();
                      }}
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
                      onClick={(e) => e.stopPropagation()}
                      className="h-6 text-sm px-1 py-0 border-0 bg-transparent focus-visible:border-0 focus-visible:ring-0 focus-visible:outline-none shadow-none flex-1 min-w-0 [&:focus]:border-0 [&:focus]:ring-0 [&:focus]:outline-none"
                    />
                  </FocusLock>
                ) : (
                  (() => {
                    const isContainer =
                      (item.getItemData()?.data as any)?.isContainer === true ||
                      (item.getItemData()?.children?.length ?? 0) > 0;
                    if (isContainer) {
                      return (
                        <button
                          type="button"
                          className="truncate text-sm select-text hover:underline text-left"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const isOpen =
                              typeof item.isExpanded === 'function' ? item.isExpanded() : false;
                            if (typeof (item as any).setExpanded === 'function') {
                              (item as any).setExpanded(!isOpen);
                            } else if (isOpen && typeof (item as any).collapse === 'function') {
                              (item as any).collapse();
                            } else if (!isOpen && typeof (item as any).expand === 'function') {
                              (item as any).expand();
                            }
                          }}
                        >
                          {space.name}
                        </button>
                      );
                    }
                    return (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (space?.id) setActiveSpaceBySpaceId(space.id);
                        }}
                        className="truncate text-sm select-text hover:underline text-left"
                      >
                        {isPlaceholder ? placeholderName : space.name}
                      </button>
                    );
                  })()
                )}
              </div>
            </div>
            <div className="capitalize text-muted-foreground text-sm px-2 h-10 select-text flex items-center">
              {isPlaceholder
                ? space.isContainer === true
                  ? 'folder'
                  : 'space'
                : (() => {
                    const itemData = item.getItemData() as SpaceTreeNode | null;
                    return itemData?.data?.isContainer === true ? 'folder' : 'space';
                  })()}
            </div>
            <div className="text-sm text-muted-foreground px-2 h-10 select-text flex items-center text-nowrap">
              {isPlaceholder
                ? '—'
                : (() => {
                    const itemData = item.getItemData() as SpaceTreeNode | null;
                    return itemData?.data?.createdAt
                      ? format(new Date(itemData.data.createdAt), 'MMMM d, yyyy')
                      : '—';
                  })()}
            </div>
            <div className="text-sm text-muted-foreground px-2 h-10 select-text flex items-center text-nowrap">
              {isPlaceholder
                ? '—'
                : (() => {
                    const itemData = item.getItemData() as SpaceTreeNode | null;
                    return itemData?.data?.updatedAt
                      ? (() => {
                          const date = new Date(itemData.data.updatedAt);
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
              {!isPlaceholder && (
                <DropdownMenu>
                  <DropdownMenuTrigger disabled={isPlaceholder || isCreating} asChild>
                    <Button
                      data-menu-trigger="true"
                      size={'icon'}
                      variant={'ghost'}
                      className="text-muted-foreground hover:!bg-input hover:border"
                    >
                      <MoreHorizontal className="size-5" />
                    </Button>
                  </DropdownMenuTrigger>
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
                      // Prevent focus from returning to the trigger; try to move to inline create input
                      e.preventDefault();
                      try {
                        const input = document.querySelector(
                          '[data-inline-create-input="true"]',
                        ) as HTMLInputElement | null;
                        if (input) {
                          input.focus();
                          // Do not select on menu close to avoid overwriting user typing
                        }
                      } catch (err) {
                        // ignore focus errors
                      }
                    }}
                  >
                    {((item.getItemData()?.data as any)?.isContainer === true ||
                      (item.getItemData()?.children?.length ?? 0) > 0) && (
                      <>
                        <DropdownMenuItem className="group" onSelect={handleAddChildSpace}>
                          <BriefcaseMedical className="mr-2 h-4 w-4 group-hover:text-foreground" />
                          Create Child Space
                        </DropdownMenuItem>
                        <DropdownMenuItem className="group" onSelect={handleAddChildFolder}>
                          <FolderClosed className="mr-2 h-4 w-4 group-hover:text-foreground" />
                          Create Child Folder
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
                    <DropdownMenuItem className="group" onSelect={handleExport}>
                      <FolderOutput className="mr-2 h-4 w-4 group-hover:text-foreground" />
                      Export
                    </DropdownMenuItem>
                    {(item.getItemData()?.data.isContainer ?? false) && (
                      <DropdownMenuItem className="group" onSelect={handleImport}>
                        <FolderInput className="mr-2 h-4 w-4 group-hover:text-foreground" />
                        Import
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="group" onSelect={handleCopy}>
                      <Copy className="mr-2 h-4 w-4 group-hover:text-foreground" />
                      Copy
                    </DropdownMenuItem>
                    <DropdownMenuItem className="group" onSelect={handleCut}>
                      <Scissors className="mr-2 h-4 w-4 group-hover:text-foreground" />
                      Cut
                    </DropdownMenuItem>
                    {(item.getItemData()?.data.isContainer ?? false) && (
                      <DropdownMenuItem
                        className={cn('group', !canPaste && 'opacity-50 cursor-not-allowed')}
                        onSelect={canPaste ? handlePaste : undefined}
                        disabled={!canPaste}
                      >
                        <Clipboard className="mr-2 h-4 w-4 group-hover:text-foreground" />
                        Paste
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="group" onSelect={handleDuplicate}>
                      <CopyPlus className="mr-2 h-4 w-4 group-hover:text-foreground" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {(item.getItemData()?.data as any)?.isContainer !== true &&
                      (item.getItemData()?.data.isFavorite ? (
                        <>
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
                          <DropdownMenuItem
                            className="group"
                            onSelect={() => handleAddToFavorites()}
                          >
                            <Star className={cn('mr-2 h-4 w-4 group-hover:text-foreground')} />
                            Add to Favorites
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      ))}

                    <DropdownMenuItem
                      className="group focus:bg-destructive/10 text-destructive hover:text-destructive focus:text-destructive"
                      onSelect={() => handleDelete()}
                    >
                      <Trash2 className="mr-2 h-4 w-4 group-focus:!text-destructive" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {!isPlaceholder && (
                <IconPicker
                  value={
                    space.icon || (item.getItemData()?.data as any)?.isContainer === true
                      ? 'folder-closed'
                      : 'briefcase'
                  }
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
              )}
            </div>
          </div>
        </TreeItem>
      </ContextMenuTrigger>
      {!isPlaceholder && (
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
                // Do not select on menu close to avoid overwriting user typing
              }
            } catch (err) {
              // ignore focus errors
            }
          }}
        >
          {((item.getItemData()?.data as any)?.isContainer === true ||
            (item.getItemData()?.children?.length ?? 0) > 0) && (
            <>
              <ContextMenuItem onSelect={handleAddChildSpace}>
                <BriefcaseMedical className="mr-2 h-4 w-4" />
                Create Child Space
              </ContextMenuItem>
              <ContextMenuItem onSelect={handleAddChildFolder}>
                <FolderClosed className="mr-2 h-4 w-4" />
                Create Child Folder
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
                value={space.icon || 'layers'}
                onValueChange={handleIconChange}
                inPlace
                searchable
              />
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuItem onSelect={handleExport}>
            <FolderOutput className="mr-2 h-4 w-4" />
            Export
          </ContextMenuItem>
          {item.getItemData()?.data.isContainer && (
            <ContextMenuItem onSelect={handleImport}>
              <FolderInput className="mr-2 h-4 w-4" />
              Import
            </ContextMenuItem>
          )}

          <ContextMenuSeparator />
          <ContextMenuItem onSelect={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </ContextMenuItem>
          <ContextMenuItem onSelect={handleCut}>
            <Scissors className="mr-2 h-4 w-4" />
            Cut
          </ContextMenuItem>
          {item.getItemData()?.data.isContainer && (
            <ContextMenuItem
              className={cn(!canPaste && 'opacity-50 cursor-not-allowed')}
              onSelect={canPaste ? handlePaste : undefined}
              disabled={!canPaste}
            >
              <Clipboard className="mr-2 h-4 w-4" />
              Paste
            </ContextMenuItem>
          )}
          <ContextMenuItem onSelect={handleDuplicate}>
            <CopyPlus className="mr-2 h-4 w-4" />
            Duplicate
          </ContextMenuItem>
          <ContextMenuSeparator />
          {(item.getItemData()?.data as any)?.isContainer !== true &&
            (item.getItemData()?.data.isFavorite ? (
              <>
                <ContextMenuItem onSelect={() => handleRemoveFromFavorites()}>
                  <Star className={cn('mr-2 h-4 w-4', 'fill-amber-400')} />
                  Remove from Favorites
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            ) : (
              <>
                <ContextMenuItem onSelect={() => handleAddToFavorites()}>
                  <Star className={cn('mr-2 h-4 w-4')} />
                  Add to Favorites
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            ))}

          <ContextMenuItem variant="destructive" onSelect={() => handleDelete()}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      )}
    </ContextMenu>
  );
}

// Memoize ManageSpacesTableRow with custom comparison to prevent unnecessary rerenders
// Only rerender if this specific item's props changed, ignoring placeholderClientId
// unless this item is the placeholder
export const ManageSpacesTableRow = React.memo(
  ManageSpacesTableRowComponent,
  (prevProps, nextProps) => {
    // Get space IDs for comparison
    const prevItemData = prevProps.item.getItemData() as SpaceTreeNode | null;
    const nextItemData = nextProps.item.getItemData() as SpaceTreeNode | null;
    const prevSpace = prevItemData?.data;
    const nextSpace = nextItemData?.data;

    // If space ID changed, definitely rerender
    if (prevSpace?.id !== nextSpace?.id) return false;

    // Check if this item is the placeholder
    const isPlaceholder = prevSpace?.id === 'new-space';
    const isNextPlaceholder = nextSpace?.id === 'new-space';

    // If placeholderClientId changed and this is the placeholder, rerender
    if (isPlaceholder || isNextPlaceholder) {
      if (prevProps.placeholderClientId !== nextProps.placeholderClientId) return false;
    }

    // Check if space data changed (shallow comparison of relevant fields)
    if (
      prevSpace?.name !== nextSpace?.name ||
      prevSpace?.icon !== nextSpace?.icon ||
      prevSpace?.isContainer !== nextSpace?.isContainer ||
      prevSpace?.clientId !== nextSpace?.clientId
    ) {
      return false;
    }

    // Check if dragging state changed for this item
    const prevIsDragging = prevProps.draggingId === prevProps.item.getId();
    const nextIsDragging = nextProps.draggingId === nextProps.item.getId();
    if (prevIsDragging !== nextIsDragging) return false;

    // Check if isLast changed
    if (prevProps.isLast !== nextProps.isLast) return false;

    // Check if item expansion state changed
    const prevIsExpanded =
      typeof prevProps.item.isExpanded === 'function' ? prevProps.item.isExpanded() : false;
    const nextIsExpanded =
      typeof nextProps.item.isExpanded === 'function' ? nextProps.item.isExpanded() : false;
    if (prevIsExpanded !== nextIsExpanded) return false;

    // If all checks pass, don't rerender
    return true;
  },
);
