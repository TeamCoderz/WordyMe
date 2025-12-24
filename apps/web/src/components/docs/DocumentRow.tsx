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
import {
  ListDocumentResult,
  useRenameDocumentMutation,
  useUpdateDocumentIconMutation,
  useDeleteDocumentMutation,
  useDocumentFavoritesMutation,
} from '../../queries/documents';
import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import FocusLock from 'react-focus-lock';
import { alert } from '../Layout/alert';

interface DocumentRowProps {
  document: ListDocumentResult[number];
  isRemoving: boolean;
  pendingRemoveId: string | null;
  onRemove: (documentId: string) => Promise<void>;
  onRename: (document: any) => void;
  openDropdownId: string | null;
  setOpenDropdownId: (id: string | null) => void;
  renamingDocumentId: string | null;
}

export function DocumentRow({
  document,
  isRemoving,
  pendingRemoveId,
  onRemove,
  onRename,
  openDropdownId,
  setOpenDropdownId,
  renamingDocumentId,
}: DocumentRowProps) {
  const [renameValue, setRenameValue] = useState<string>('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

  const { updateDocumentName } = useRenameDocumentMutation({ document });
  const { updateDocumentIcon } = useUpdateDocumentIconMutation({ document });
  const { mutate: deleteDocument, isPending: isDeleting } = useDeleteDocumentMutation({ document });
  const { addToDocumentFavorites } = useDocumentFavoritesMutation({
    document,
  });

  const handleRename = (document: any) => {
    onRename(document);
    setRenameValue(document.name);
    setOpenDropdownId(null);
  };

  const handleRenameKeyDown = async (e: React.KeyboardEvent, documentId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (renameValue.trim()) {
        try {
          await updateDocumentName(documentId, renameValue.trim());
          setRenameValue('');
          onRename({ id: null }); // This will set renamingDocumentId to null in parent
        } catch (error) {
          // Error handling is done in the mutation
        }
      }
    } else if (e.key === 'Escape') {
      setRenameValue('');
      onRename({ id: null }); // This will set renamingDocumentId to null in parent
    }
  };

  const handleIconChange = async (documentId: string, newIcon: string) => {
    try {
      await updateDocumentIcon(documentId, newIcon);
      setIsIconPickerOpen(false);
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleChangeIcon = () => {
    setIsIconPickerOpen(true);
    setOpenDropdownId(null);
  };

  const handleDelete = () => {
    alert({
      title: 'Delete Document',
      description: `Are you sure you want to delete "${document.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: () => {
        deleteDocument({ documentId: document.id });
      },
    });
  };

  const handleAddToFavorites = () => {
    addToDocumentFavorites(document.id);
  };

  const handleRemoveFromFavorites = () => {
    alert({
      title: 'Remove from Favorites',
      description: `Are you sure you want to remove "${document.name}" from your favorites?`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      onConfirm: () => {
        onRemove(document.id);
      },
      buttonVariant: 'destructive',
    });
  };

  // Update renameValue when renamingDocumentId changes
  useEffect(() => {
    if (renamingDocumentId === document.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRenameValue(document.name);
    }
  }, [renamingDocumentId, document.id, document.name]);

  // Cancel rename when clicking outside the input
  useEffect(() => {
    if (renamingDocumentId !== document.id) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const input = renameInputRef.current;
      const target = e.target as Node | null;
      if (!input) return;
      if (target && input.contains(target)) return;
      setRenameValue('');
      onRename({ id: null });
    };

    window.addEventListener('mousedown', handlePointerDown, true);
    window.addEventListener('touchstart', handlePointerDown, true);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown, true);
      window.removeEventListener('touchstart', handlePointerDown, true);
    };
  }, [renamingDocumentId, document.id, onRename]);

  // Close picker when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isIconPickerOpen && event.target instanceof Element) {
        // Check if click is outside the popover content
        const popoverContent = globalThis.document.querySelector('[data-slot="popover-content"]');

        if (popoverContent && !popoverContent.contains(event.target)) {
          // Also check if clicking on the icon button that opened this picker
          const iconButton = event.target.closest('button');
          const isIconButton =
            iconButton && iconButton.closest(`[data-document-id="${document.id}"]`);

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
      globalThis.document.addEventListener('click', handleClickOutside);
      return () => globalThis.document.removeEventListener('click', handleClickOutside);
    }
    return undefined;
  }, [isIconPickerOpen, document.id]);

  return (
    <>
      {/* Backdrop to prevent mouse events when icon picker is open */}
      {isIconPickerOpen && <div className="fixed inset-0 z-40 pointer-events-auto" />}

      <TableRow
        data-document-id={document.id}
        className={isRemoving && pendingRemoveId === document.id ? 'animate-pulse' : undefined}
      >
        <TableCell className="text-foreground">
          <div className="flex items-center gap-2">
            <IconPicker
              value={document.icon || 'file'}
              onValueChange={(newIcon) => handleIconChange(document.id, newIcon)}
              searchable={true}
              searchPlaceholder="Search icons..."
              side="right"
              align="start"
              sideOffset={8}
              alignOffset={-4}
            >
              <button className="flex items-center justify-center p-0.5 hover:bg-accent/50 rounded-sm">
                <DynamicIcon className="size-4" name={document.icon || 'file'} />
              </button>
            </IconPicker>
            {renamingDocumentId === document.id ? (
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
                  onKeyDown={(e) => handleRenameKeyDown(e, document.id)}
                  className="h-6 text-sm px-1 py-0 border-0 bg-transparent focus-visible:border-0 focus-visible:ring-0 focus-visible:outline-none shadow-none flex-1 min-w-0"
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              </FocusLock>
            ) : (
              <Link
                to="/view/$handle"
                params={{ handle: (document as any).handle ?? document.id }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="truncate hover:underline"
              >
                {document.name}
              </Link>
            )}
          </div>
        </TableCell>
        <TableCell className="capitalize">{document.type}</TableCell>
        <TableCell>{format(new Date(document.createdAt), 'MMMM d, yyyy')}</TableCell>
        <TableCell>
          {(() => {
            const updatedDate = new Date(document.updatedAt);
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
              open={openDropdownId === document.id}
              onOpenChange={(open) => setOpenDropdownId(open ? document.id : null)}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="hover:!bg-input hover:border"
                  disabled={isRemoving && pendingRemoveId === document.id}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleRename(document)}>
                  <PencilLine className="mr-2 h-4 w-4" />
                  Change Name
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleChangeIcon}>
                  <Repeat2 className="mr-2 h-4 w-4" />
                  Change Icon
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {document.isFavorite ? (
                  <DropdownMenuItem onClick={handleRemoveFromFavorites}>
                    <StarOff className="mr-2 h-4 w-4" />
                    Remove from Favorites
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handleAddToFavorites}>
                    <Star className="mr-2 h-4 w-4" />
                    Add to Favorites
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 focus:text-destructive focus:bg-destructive/10 group"
                >
                  <Trash2 className="mr-2 h-4 w-4 text-destructive group-focus:!text-destructive" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <IconPicker
              value={document.icon || 'file'}
              onValueChange={(newIcon) => handleIconChange(document.id, newIcon)}
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
          </div>
        </TableCell>

        {/* IconPicker positioned relative to the entire table row */}
      </TableRow>
    </>
  );
}
