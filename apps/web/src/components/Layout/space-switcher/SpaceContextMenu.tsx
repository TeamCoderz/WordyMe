/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';

import {
  Star,
  PencilLine,
  Repeat2,
  Settings2,
  FolderClosed,
  Copy,
  Scissors,
  Clipboard,
  CopyPlus,
  Trash2,
  BriefcaseMedical,
} from '@repo/ui/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { SpaceContextMenuProps } from './types';
import { cn } from '@repo/ui/lib/utils';
import { useNavigate } from '@tanstack/react-router';
import { useIsMobile } from '@repo/ui/hooks/use-mobile';

export function SpaceContextMenu({
  space,
  isOpen,
  onOpenChange,
  onCloseSwitcher,
  onAddChildSpace,
  onAddChildFolder,
  onChangeIcon,
  onRename,
  onAddToFavorites,
  onRemoveFromFavorites,
  isFavorite = false,
  onCopy,
  onCut,
  onPaste,
  canPaste,
  onDuplicate,
  onDelete,
}: SpaceContextMenuProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  if (!isOpen) return null;

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
      >
        {/* Add Child Space - only when handler provided */}

        {onAddChildSpace && (
          <>
            <DropdownMenuItem className="group" onClick={() => onAddChildSpace(space)}>
              <BriefcaseMedical className="mr-2 h-4 w-4 group-hover:text-foreground" />
              Create Child Space
            </DropdownMenuItem>
          </>
        )}
        {onAddChildFolder && (
          <>
            <DropdownMenuItem className="group" onClick={() => onAddChildFolder(space)}>
              <FolderClosed className="mr-2 h-4 w-4 group-hover:text-foreground" />
              Create Child Folder
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem className="group" onClick={() => onRename(space)}>
          <PencilLine className="mr-2 h-4 w-4 group-hover:text-foreground" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem className="group" onClick={() => onChangeIcon(space)}>
          <Repeat2 className="mr-2 h-4 w-4 group-hover:text-foreground" />
          Change Icon
        </DropdownMenuItem>

        <DropdownMenuItem
          className="group"
          onSelect={() => {
            navigate({ to: '/spaces/manage', search: { item: space.id } });
            onOpenChange(false);
            onCloseSwitcher();
          }}
        >
          <Settings2 className="mr-2 h-4 w-4 group-hover:text-foreground" />
          Manage
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {onCopy && (
          <DropdownMenuItem className="group" onClick={() => onCopy(space)}>
            <Copy className="mr-2 h-4 w-4 group-hover:text-foreground" />
            Copy
          </DropdownMenuItem>
        )}
        {onCut && (
          <DropdownMenuItem className="group" onClick={() => onCut(space)}>
            <Scissors className="mr-2 h-4 w-4 group-hover:text-foreground" />
            Cut
          </DropdownMenuItem>
        )}
        {onPaste && (
          <DropdownMenuItem
            className={cn('group', !canPaste && 'opacity-50 cursor-not-allowed')}
            onClick={canPaste ? () => onPaste(space) : undefined}
            disabled={!canPaste}
          >
            <Clipboard className="mr-2 h-4 w-4 group-hover:text-foreground" />
            Paste
          </DropdownMenuItem>
        )}
        {onDuplicate && (
          <DropdownMenuItem className="group" onClick={() => onDuplicate(space)}>
            <CopyPlus className="mr-2 h-4 w-4 group-hover:text-foreground" />
            Duplicate
          </DropdownMenuItem>
        )}
        {!space.isContainer &&
          (isFavorite ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="group" onClick={() => onRemoveFromFavorites(space)}>
                <Star
                  className={cn(
                    'mr-2 h-4 w-4 fill-current group-hover:text-foreground',
                    isFavorite && 'fill-amber-400',
                  )}
                />
                Remove from Favorites
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="group" onClick={() => onAddToFavorites(space)}>
                <Star className={cn('mr-2 h-4 w-4 group-hover:text-foreground')} />
                Add to Favorites
              </DropdownMenuItem>
            </>
          ))}
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="group focus:bg-destructive/10 text-destructive hover:text-destructive focus:text-destructive"
              onClick={() => onDelete(space)}
            >
              <Trash2 className="mr-2 h-4 w-4 group-focus:!text-destructive" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
