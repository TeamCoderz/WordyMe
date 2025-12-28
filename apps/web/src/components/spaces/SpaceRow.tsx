import { Button } from '@repo/ui/components/button';
import { TableCell, TableRow } from '@repo/ui/components/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@repo/ui/components/dropdown-menu';
import { IconPicker } from '@repo/ui/components/icon-picker';
import { Input } from '@repo/ui/components/input';
import {
  Star,
  MoreHorizontal,
  PencilLine,
  StarOff,
  Repeat2,
  Trash2,
} from '@repo/ui/components/icons';
import { DynamicIcon } from '@repo/ui/components/dynamic-icon';
import { format, differenceInSeconds, formatDistanceToNowStrict } from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import FocusLock from 'react-focus-lock';
import { alert } from '../Layout/alert';
import { ListSpaceResult, useDeleteSpaceMutation } from '@/queries/spaces';
import { useActions } from '@/store';

interface SpaceRowProps {
  space: ListSpaceResult[number];
  isRemoving: boolean;
  pendingRemoveId: string | null;
  onRemove: (spaceId: string) => Promise<void>;
  onRename: (space: any) => void;
  onUpdateSpaceName: (spaceId: string, newName: string) => Promise<void>;
  onUpdateSpaceIcon: (spaceId: string, newIcon: string) => Promise<void>;
  openDropdownId: string | null;
  setOpenDropdownId: (id: string | null) => void;
  renamingSpaceId: string | null;
}

export function SpaceRow({
  space,
  isRemoving,
  pendingRemoveId,
  onRemove,
  onRename,
  onUpdateSpaceName,
  onUpdateSpaceIcon,
  openDropdownId,
  setOpenDropdownId,
  renamingSpaceId,
}: SpaceRowProps) {
  const [renameValue, setRenameValue] = useState<string>('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const { setActiveSpaceBySpaceId } = useActions();
  const deleteSpaceMutation = useDeleteSpaceMutation({ space });

  const handleRename = (space: any) => {
    onRename(space);
    setRenameValue(space.name);
    setOpenDropdownId(null);
  };

  const handleRenameKeyDown = async (e: React.KeyboardEvent, spaceId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (renameValue.trim()) {
        try {
          await onUpdateSpaceName(spaceId, renameValue.trim());
          setRenameValue('');
        } catch (error) {
          // Error handling is done in the parent component
        }
      }
    } else if (e.key === 'Escape') {
      setRenameValue('');
    }
  };

  const handleIconChange = async (spaceId: string, newIcon: string) => {
    try {
      await onUpdateSpaceIcon(spaceId, newIcon);
      setIsIconPickerOpen(false);
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const handleChangeIcon = () => {
    setIsIconPickerOpen(true);
    setOpenDropdownId(null);
  };

  const handleRemoveFromFavorites = () => {
    alert({
      title: 'Remove from Favorites',
      description: `Are you sure you want to remove "${space.name}" from your favorites?`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      onConfirm: () => {
        onRemove(space.id);
      },
      buttonVariant: 'destructive',
    });
  };

  const handleDelete = () => {
    alert({
      title: 'Delete Space',
      description: `Are you sure you want to delete "${space.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await deleteSpaceMutation.mutateAsync({ spaceId: space.id });
        } catch (error) {
          // Error handling is done in the mutation
        }
      },
      buttonVariant: 'destructive',
    });
  };

  // Update renameValue when renamingSpaceId changes
  useEffect(() => {
    if (renamingSpaceId === space.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRenameValue(space.name);
    }
  }, [renamingSpaceId, space.id, space.name]);

  // Cancel rename when clicking outside the input
  useEffect(() => {
    if (renamingSpaceId !== space.id) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const input = renameInputRef.current;
      const target = e.target as Node | null;
      if (!input) return;
      if (target && input.contains(target)) return;
      setRenameValue('');
      onRename({ id: null } as any);
    };

    window.addEventListener('mousedown', handlePointerDown, true);
    window.addEventListener('touchstart', handlePointerDown, true);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown, true);
      window.removeEventListener('touchstart', handlePointerDown, true);
    };
  }, [renamingSpaceId, space.id, onRename]);

  // Close picker when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isIconPickerOpen && event.target instanceof Element) {
        // Check if click is outside the popover content
        const popoverContent = document.querySelector('[data-slot="popover-content"]');

        if (popoverContent && !popoverContent.contains(event.target)) {
          // Also check if clicking on the icon button that opened this picker
          const iconButton = event.target.closest('button');
          const isIconButton = iconButton && iconButton.closest(`[data-space-id="${space.id}"]`);

          // Check if clicking on the backdrop
          const isBackdrop =
            (event.target as Element).classList.contains('fixed') &&
            (event.target as Element).classList.contains('inset-0');

          if (!isIconButton || isBackdrop) {
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

  return (
    <>
      {/* Backdrop to prevent mouse events when icon picker is open */}
      {isIconPickerOpen && <div className="fixed inset-0 z-40 pointer-events-auto" />}

      <TableRow
        data-space-id={space.id}
        className={isRemoving && pendingRemoveId === space.id ? 'animate-pulse' : undefined}
      >
        <TableCell className="text-foreground">
          <div className="flex items-center gap-2">
            <IconPicker
              value={space.icon || 'folder'}
              onValueChange={(newIcon) => handleIconChange(space.id, newIcon)}
              searchable={true}
              searchPlaceholder="Search icons..."
              side="right"
              align="start"
              sideOffset={8}
              alignOffset={-4}
            >
              <button className="flex items-center justify-center p-0.5 hover:bg-accent/50 rounded-sm">
                <DynamicIcon className="size-4" name={space.icon || 'folder'} />
              </button>
            </IconPicker>
            {renamingSpaceId === space.id ? (
              <FocusLock>
                <Input
                  ref={(el) => {
                    renameInputRef.current = el;
                    if (el && !el.dataset.focused) {
                      el.dataset.focused = 'true';
                      setTimeout(() => {
                        el.focus();
                        el.select();
                      }, 0);
                    }
                  }}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => handleRenameKeyDown(e, space.id)}
                  className="h-6 text-sm px-1 py-0 border-0 bg-transparent focus-visible:border-0 focus-visible:ring-0 focus-visible:outline-none shadow-none flex-1 min-w-0"
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              </FocusLock>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (space?.id) setActiveSpaceBySpaceId(space.id);
                }}
                className="truncate hover:underline text-left"
              >
                {space.name}
              </button>
            )}
          </div>
        </TableCell>
        <TableCell className="capitalize">{space.documentType}</TableCell>
        <TableCell>{format(new Date(space.createdAt), 'MMMM d, yyyy')}</TableCell>
        <TableCell>
          {(() => {
            const updatedDate = new Date(space.updatedAt);
            const seconds = differenceInSeconds(new Date(), updatedDate);
            if (seconds < 60) return 'Just now';
            return formatDistanceToNowStrict(updatedDate, {
              addSuffix: true,
            });
          })()}
        </TableCell>
        <TableCell>
          <div className="flex items-center justify-end gap-2">
            <DropdownMenu
              open={openDropdownId === space.id}
              onOpenChange={(open) => setOpenDropdownId(open ? space.id : null)}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="hover:!bg-input hover:border"
                  disabled={isRemoving && pendingRemoveId === space.id}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleRename(space)}>
                  <PencilLine className="mr-2 h-4 w-4" />
                  Change Name
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleChangeIcon}>
                  <Repeat2 className="mr-2 h-4 w-4" />
                  Change Icon
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleRemoveFromFavorites}>
                  <StarOff className="mr-2 h-4 w-4" />
                  Remove from Favorites
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={deleteSpaceMutation.isPending}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4 text-destructive group-focus:!text-destructive" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <IconPicker
              value={space.icon || 'folder'}
              onValueChange={(newIcon) => handleIconChange(space.id, newIcon)}
              open={isIconPickerOpen}
              onOpenChange={(open) => {
                // Only allow closing if explicitly requested
                if (!open) {
                  setIsIconPickerOpen(false);
                }
              }}
              side="right"
              align="start"
              sideOffset={8}
              alignOffset={-4}
            >
              <div />
            </IconPicker>
            <Button
              size={'icon'}
              variant={'ghost'}
              disabled={isRemoving && pendingRemoveId === space.id}
              onClick={handleRemoveFromFavorites}
            >
              <Star className="size-6 stroke-none fill-[#F2C40D]" />
            </Button>
          </div>
        </TableCell>

        {/* IconPicker positioned relative to the entire table row */}
      </TableRow>
    </>
  );
}
