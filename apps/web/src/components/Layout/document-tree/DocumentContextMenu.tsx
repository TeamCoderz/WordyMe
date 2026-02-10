'use client';

import {
  PencilLine,
  Repeat2,
  Trash2,
  Star,
  FilePlus,
  FolderPlus,
  Settings2,
  Copy,
  Clipboard,
  Scissors,
  CopyPlus,
} from '@repo/ui/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { DocumentContextMenuProps } from './types';
import { useIsMobile } from '@repo/ui/hooks/use-mobile';

export function DocumentContextMenu({
  document,
  isOpen,
  onOpenChange,
  onRename,
  onCreateFolder,
  onChangeIcon,
  onAddToFavorites,
  onRemoveFromFavorites,
  onCreateChildNote,
  onCreateChildFolder,
  onManage,
  onDelete,
  onCopy,
  onCut,
  onPaste,
  canPaste = false,
  onDuplicate,
}: DocumentContextMenuProps) {
  const isMobile = useIsMobile();
  if (!isOpen) return null;

  // For the create section, show different options
  if (document.id === 'create-new') {
    return (
      <DropdownMenu
        open={true}
        onOpenChange={(open) => {
          if (!open) onOpenChange(false);
        }}
      >
        <DropdownMenuTrigger className="absolute inset-0 opacity-0 pointer-events-none" />
        <DropdownMenuContent
          side={isMobile ? 'bottom' : 'right'}
          align="start"
          sideOffset={8}
          alignOffset={-4}
          collisionPadding={8}
          className="p-2"
          onContextMenu={(e) => {
            e.stopPropagation();
          }}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DropdownMenuItem className="group" onClick={onRename}>
            <FilePlus className="mr-2 h-4 w-4 group-hover:text-foreground" />
            Create Note
          </DropdownMenuItem>

          {onCreateFolder && (
            <DropdownMenuItem className="group" onClick={onCreateFolder}>
              <FolderPlus className="mr-2 h-4 w-4 group-hover:text-foreground" />
              Create Folder
            </DropdownMenuItem>
          )}

          {onManage && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="group" onClick={onManage}>
                <Settings2 className="mr-2 h-4 w-4 group-hover:text-foreground" />
                Manage Documents
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Check if document is favorited

  return (
    <DropdownMenu
      open={true}
      onOpenChange={(open) => {
        if (!open) onOpenChange(false);
      }}
    >
      <DropdownMenuTrigger className="absolute inset-0 opacity-0 pointer-events-none" />
      <DropdownMenuContent
        side={isMobile ? 'bottom' : 'right'}
        align="start"
        sideOffset={8}
        alignOffset={-4}
        collisionPadding={8}
        className="p-2"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {onCreateChildNote && (
          <DropdownMenuItem className="group" onClick={onCreateChildNote}>
            <FilePlus className="mr-2 h-4 w-4 group-hover:text-foreground" />
            Add Child Note
          </DropdownMenuItem>
        )}
        {onCreateChildFolder && (
          <DropdownMenuItem className="group" onClick={onCreateChildFolder}>
            <FolderPlus className="mr-2 h-4 w-4 group-hover:text-foreground" />
            Add Child Folder
          </DropdownMenuItem>
        )}

        {onCreateChildNote && <DropdownMenuSeparator />}

        <DropdownMenuItem className="group" onClick={onRename}>
          <PencilLine className="mr-2 h-4 w-4 group-hover:text-foreground" />
          Rename
        </DropdownMenuItem>

        <DropdownMenuItem className="group" onClick={onChangeIcon}>
          <Repeat2 className="mr-2 h-4 w-4 group-hover:text-foreground" />
          Change Icon
        </DropdownMenuItem>

        {onManage && (
          <DropdownMenuItem className="group" onClick={onManage}>
            <Settings2 className="mr-2 h-4 w-4 group-hover:text-foreground" />
            Manage
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {onAddToFavorites &&
          onRemoveFromFavorites &&
          (document.isFavorite ? (
            <>
              <DropdownMenuItem className="group" onClick={onRemoveFromFavorites}>
                <Star className="mr-2 h-4 w-4 group-hover:text-foreground fill-amber-400" />
                Remove from Favorites
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : (
            <>
              <DropdownMenuItem className="group" onClick={onAddToFavorites}>
                <Star className="mr-2 h-4 w-4 group-hover:text-foreground" />
                Add to Favorites
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ))}

        {onCopy && (
          <DropdownMenuItem className="group" onClick={onCopy}>
            <Copy className="mr-2 h-4 w-4 group-hover:text-foreground" />
            Copy
          </DropdownMenuItem>
        )}

        {onCut && (
          <DropdownMenuItem className="group" onClick={onCut}>
            <Scissors className="mr-2 h-4 w-4 group-hover:text-foreground" />
            Cut
          </DropdownMenuItem>
        )}

        {onPaste && (
          <DropdownMenuItem
            className={`group ${!canPaste ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={canPaste ? onPaste : undefined}
            disabled={!canPaste}
          >
            <Clipboard className="mr-2 h-4 w-4 group-hover:text-foreground" />
            Paste
          </DropdownMenuItem>
        )}

        {onDuplicate && (
          <DropdownMenuItem className="group" onClick={onDuplicate}>
            <CopyPlus className="mr-2 h-4 w-4 group-hover:text-foreground" />
            Duplicate
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="group focus:bg-destructive/10 text-destructive hover:text-destructive focus:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="mr-2 h-4 w-4 group-focus:!text-destructive" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
