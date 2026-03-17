/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { cn } from '@repo/ui/lib/utils';
import { useDroppable } from '@dnd-kit/core';
import { useSelector } from '@/store';
import { useUrlDropOnPaneContent } from './useUrlDropOnPaneContent';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useMediaQuery } from '@repo/ui/hooks/use-media-query';
import { ScrollArea } from '@repo/ui/components/scroll-area';
import { getLocationFromDragEvent } from './utils';

export const PANE_CONTENT_SPLIT_PRIMARY = 'pane-content-split-primary';
export const PANE_CONTENT_SPLIT_SECONDARY = 'pane-content-split-secondary';

export interface PaneContentProps {
  pane: 'primary' | 'secondary';
  children: ReactNode;
  className?: string;
}

/**
 * Droppable wrapper for the pane content area (editor). Shows VSCode-like
 * visual feedback when dragging a tab from the opposite pane over the content.
 * When there is no split, shows two w-1/2 zones: left = keep tab in primary and
 * move others to secondary; right = move tab to secondary.
 */
export function PaneContent({ pane, children, className }: PaneContentProps) {
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const hasSplit = useSelector((state) => state.tabs.paneTabIds.secondary.length > 0);
  const isEditorTab = useSelector((state) =>
    state.tabs.tabList
      .find((t) => t.id === state.tabs.activeTabId[pane])
      ?.pathname.startsWith('/edit'),
  );
  const { isDragging: isLinkOverPaneContent, dropHandlers: linkDropHandlers } =
    useUrlDropOnPaneContent(pane);
  const { setNodeRef, isOver, active } = useDroppable({
    id: `pane-content-${pane}`,
    data: {
      type: 'pane-content',
      pane,
    },
  });

  const isTabDragging = active?.data?.current?.type === 'tab';
  const tabPane = (active?.data?.current as { pane?: 'primary' | 'secondary' })?.pane;
  const isTabDropTarget = isOver && isTabDragging && (hasSplit ? tabPane !== pane : false);

  const [isLinkDragging, setIsLinkDragging] = useState(false);
  const [isShiftHeld, setIsShiftHeld] = useState(false);
  const handleDrag = useCallback((e: DragEvent) => {
    const location = getLocationFromDragEvent(e);
    setIsLinkDragging(location !== null);
    setIsShiftHeld(e.shiftKey);
  }, []);
  const handleDragEnd = useCallback(() => {
    setIsLinkDragging(false);
    setIsShiftHeld(false);
  }, []);
  useEffect(() => {
    window.addEventListener('drag', handleDrag);
    window.addEventListener('dragend', handleDragEnd);
    return () => {
      window.removeEventListener('drag', handleDrag);
      window.removeEventListener('dragend', handleDragEnd);
      setIsLinkDragging(false);
      setIsShiftHeld(false);
    };
  }, [handleDrag, handleDragEnd]);

  // When no split and primary pane: two droppable zones for tab drag.
  // For link drag: three zones (left, full, right) — left+full = primary, right = secondary.
  const showTabSplitZones =
    !hasSplit && pane === 'primary' && isTabDragging && tabPane === 'primary';
  const showLinkSplitZones =
    !hasSplit && pane === 'primary' && isLinkDragging && (!isShiftHeld || !isEditorTab);
  const showPaneSplitZone =
    !showTabSplitZones &&
    !showLinkSplitZones &&
    (isTabDropTarget || (isLinkDragging && (!isShiftHeld || !isEditorTab)));

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 min-h-0 relative',
        {
          'pb-(--keyboard-inset-height)': !hasSplit || !isPortrait || pane === 'secondary',
        },
        className,
      )}
    >
      <ScrollArea className="h-full *:data-radix-scroll-area-viewport:*:block! *:data-radix-scroll-area-viewport:*:h-full">
        {children}
      </ScrollArea>
      {showTabSplitZones && <TabSplitDropZones />}
      {showLinkSplitZones && <LinkSplitDropZones />}
      <div
        className={cn(
          'absolute inset-0 top-0 z-50 flex flex-col items-center justify-center gap-2',
          {
            'ring-2 ring-primary/40 bg-primary/5 ring-inset border-primary/5':
              isLinkOverPaneContent || isTabDropTarget,
            hidden: !showPaneSplitZone,
          },
        )}
        {...linkDropHandlers}
        aria-hidden
      >
        {isLinkOverPaneContent && isEditorTab && (
          <span className="flex items-center gap-2 rounded-md bg-background/90 px-3 py-2 text-sm text-muted-foreground shadow-sm">
            Hold
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">Shift</kbd>
            to insert into editor
          </span>
        )}
      </div>
    </div>
  );
}

function TabSplitDropZones() {
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const { setNodeRef: setLeftRef, isOver: isOverLeft } = useDroppable({
    id: PANE_CONTENT_SPLIT_PRIMARY,
    data: { type: 'pane-content-split', pane: 'primary' as const },
  });
  const { setNodeRef: setRightRef, isOver: isOverRight } = useDroppable({
    id: PANE_CONTENT_SPLIT_SECONDARY,
    data: { type: 'pane-content-split', pane: 'secondary' as const },
  });

  return (
    <>
      <div
        id={PANE_CONTENT_SPLIT_PRIMARY}
        ref={setLeftRef}
        className={cn('absolute top-0 left-0 z-50 pointer-events-auto cursor-copy', {
          'right-0 bottom-1/2': isPortrait,
          'right-1/2 bottom-0': !isPortrait,
          'ring-2 ring-inset ring-primary/40 bg-primary/5': isOverLeft,
        })}
        aria-hidden
      />
      <div
        id={PANE_CONTENT_SPLIT_SECONDARY}
        ref={setRightRef}
        className={cn('absolute right-0 bottom-0 z-50 pointer-events-auto cursor-copy', {
          'ring-2 ring-inset ring-primary/40 bg-primary/5': isOverRight,
          'left-0 top-1/2': isPortrait,
          'left-1/2 top-0': !isPortrait,
        })}
        aria-hidden
      />
    </>
  );
}

function LinkSplitDropZones() {
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const isPrimaryEditorTab = useSelector((state) =>
    state.tabs.tabList
      .find((t) => t.id === state.tabs.activeTabId.primary)
      ?.pathname.startsWith('/edit'),
  );
  const isSecondaryEditorTab = useSelector((state) =>
    state.tabs.tabList
      .find((t) => t.id === state.tabs.activeTabId.secondary)
      ?.pathname.startsWith('/edit'),
  );
  const left = useUrlDropOnPaneContent('primary');
  const full = useUrlDropOnPaneContent('primary');
  const right = useUrlDropOnPaneContent('secondary');

  return (
    <>
      <div
        className={cn(
          'absolute z-50 flex items-center justify-center pointer-events-auto cursor-copy transition-colors',
          {
            'w-full top-1/3 bottom-1/3': isPortrait,
            'left-1/3 right-1/3 top-0 bottom-0': !isPortrait,
            'ring-2 ring-inset ring-primary/40 bg-primary/5 w-full top-0 right-0 bottom-0 left-0':
              full.isDragging,
          },
        )}
        aria-hidden
        {...full.dropHandlers}
      >
        {full.isDragging && isPrimaryEditorTab && (
          <span className="flex items-center gap-2 rounded-md bg-background/90 px-3 py-2 text-sm text-muted-foreground shadow-sm">
            Hold
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">Shift</kbd>
            to insert into editor
          </span>
        )}
      </div>
      <div
        id={PANE_CONTENT_SPLIT_PRIMARY}
        className={cn(
          'absolute top-0 z-50 flex items-center justify-center pointer-events-auto cursor-copy transition-colors',
          {
            'w-full bottom-2/3': isPortrait,
            'bottom-1/2': isPortrait && left.isDragging,
            'w-1/3 left-0 bottom-0': !isPortrait,
            'w-1/2': !isPortrait && left.isDragging,
            'ring-2 ring-inset ring-primary/40 bg-primary/5': left.isDragging,
          },
        )}
        aria-hidden
        {...left.dropHandlers}
      >
        {left.isDragging && isPrimaryEditorTab && (
          <span className="flex items-center gap-2 rounded-md bg-background/90 px-3 py-2 text-sm text-muted-foreground shadow-sm">
            Hold
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">Shift</kbd>
            to insert into editor
          </span>
        )}
      </div>
      <div
        id={PANE_CONTENT_SPLIT_SECONDARY}
        className={cn(
          'absolute bottom-0 z-50 flex items-center justify-center pointer-events-auto cursor-copy transition-colors',
          {
            'w-full top-2/3': isPortrait,
            'top-1/2': isPortrait && right.isDragging,
            'w-1/3 right-0 top-0': !isPortrait,
            'w-1/2': !isPortrait && right.isDragging,
            'ring-2 ring-inset ring-primary/40 bg-primary/5': right.isDragging,
          },
        )}
        aria-hidden
        {...right.dropHandlers}
      >
        {right.isDragging && (isSecondaryEditorTab ?? isPrimaryEditorTab) && (
          <span className="flex items-center gap-2 rounded-md bg-background/90 px-3 py-2 text-sm text-muted-foreground shadow-sm">
            Hold
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">Shift</kbd>
            to insert into editor
          </span>
        )}
      </div>
    </>
  );
}
