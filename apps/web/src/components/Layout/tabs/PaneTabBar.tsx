/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { cn } from '@repo/ui/lib/utils';
import { useSelector, useActions } from '@/store';
import { Tab } from './Tab';
import { TabBarContextMenu } from './TabBarContextMenu';
import { useCallback, useRef, useEffect } from 'react';
import { useUrlDropOnTabBar } from './useUrlDropOnTabBar';
import { useDroppable } from '@dnd-kit/core';
import type { Tab as TabType } from '@repo/types';
import { Button } from '@repo/ui/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/components/tooltip';
import {
  PanelRightCloseIcon,
  PanelTopCloseIcon,
  SquareSplitHorizontalIcon,
  SquareSplitVerticalIcon,
} from '@repo/ui/components/icons';
import { useMediaQuery } from '@repo/ui/hooks/use-media-query';
import { ScrollArea } from '@repo/ui/components/scroll-area';
import { useHotkey } from '@tanstack/react-hotkeys';

export interface PaneTabBarProps {
  pane: 'primary' | 'secondary';
  className?: string;
}

export function PaneTabBar({ pane, className }: PaneTabBarProps) {
  const tabsViewportRef = useRef<HTMLDivElement>(null);

  const paneTabCount = useSelector((state) => state.tabs.paneTabIds[pane].length);
  const activeTab = useSelector((state) =>
    state.tabs.tabList.find((t) => t.id === state.tabs.activeTabId[pane]),
  );
  const activePane = useSelector((state) => state.tabs.activePane);
  // Get the actual tab objects for this pane
  const paneTabs = useSelector(
    (state) =>
      state.tabs.paneTabIds[pane]
        .map((id) => state.tabs.tabList.find((t) => t.id === id))
        .filter(Boolean) as TabType[],
  );

  const { closeTab, closeOtherTabs } = useActions();

  const { setNodeRef: setTabBarEndSlotRef, isOver: isOverTabBarEndSlot } = useDroppable({
    id: `pane-tabbar-${pane}`,
    data: {
      type: 'tab-slot',
      pane,
      index: paneTabCount,
      side: 'left',
    },
  });

  // Map vertical mouse wheel to horizontal scroll (native wheel is vertical only).
  // Radix Viewport wraps content in an inner div, so we use closest() to find the scroll container.
  useEffect(() => {
    const viewport = tabsViewportRef.current;
    if (!viewport) return;

    const handler = (e: WheelEvent) => {
      if (e.deltaY === 0 || e.deltaX !== 0) return;
      const maxScroll = viewport.scrollWidth - viewport.clientWidth;
      if (maxScroll <= 0) return;

      e.preventDefault();
      const newPos = Math.max(0, Math.min(maxScroll, viewport.scrollLeft + e.deltaY));
      viewport.scrollLeft = newPos;
    };

    viewport.addEventListener('wheel', handler, { passive: false });
    return () => viewport.removeEventListener('wheel', handler);
  }, []);

  // Scroll active tab into view
  useEffect(() => {
    if (!activeTab || !tabsViewportRef.current) return;

    const activeTabElement = tabsViewportRef.current.querySelector(
      `[data-tab-id="${activeTab.id}"]`,
    );
    if (activeTabElement) {
      activeTabElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [activeTab]);

  const { openTab, closeSplit } = useActions();
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const targetPane = pane === 'primary' ? 'secondary' : 'primary';
  const splitLabel =
    pane === 'primary' ? (isPortrait ? 'Split Bottom' : 'Split Right') : 'Close Split View';

  const handleOpenInSplit = useCallback(() => {
    if (!activeTab) return;
    openTab({
      pathname: activeTab.pathname,
      search: activeTab.search,
      hash: activeTab.hash,
      pane: targetPane,
    });
  }, [activeTab, openTab, targetPane]);

  // Copy link with search params and hash
  const handleCopyPath = useCallback(() => {
    if (!activeTab) return;

    const searchParams =
      Object.keys(activeTab.search ?? {}).length > 0
        ? `?${new URLSearchParams(activeTab.search as Record<string, string>).toString()}`
        : '';
    const hash = activeTab.hash ? `#${activeTab.hash}` : '';
    navigator.clipboard.writeText(
      window.location.origin + activeTab.pathname + searchParams + hash,
    );
  }, [activeTab]);

  // External URL drops (address bar, bookmarks): dnd-kit doesn't support these,
  // so we use native HTML5 drag events via useUrlDropOnTabBar.
  const {
    isLinkDragging,
    dropIndicatorLeft: linkDropIndicatorLeft,
    dropHandlers,
  } = useUrlDropOnTabBar(pane, tabsViewportRef, paneTabCount);

  useHotkey(
    'Mod+Alt+W',
    () => {
      if (!activeTab) return;
      const isHomeTab = activeTab.pathname === '/';
      const isLastTab = paneTabs.length === 1;
      if (!(isHomeTab && isLastTab)) closeTab(activeTab.id);
    },
    { enabled: pane === activePane, conflictBehavior: 'allow' },
  );
  useHotkey(
    'Mod+Alt+T',
    () => {
      if (!activeTab) return;
      closeOtherTabs(activeTab.id);
    },
    { enabled: pane === activePane, conflictBehavior: 'allow' },
  );
  useHotkey(
    'Mod+Shift+C',
    () => {
      handleCopyPath();
    },
    { enabled: pane === activePane, conflictBehavior: 'allow' },
  );

  return (
    <div
      className={cn(
        'flex h-14 justify-between items-center border-b select-none overflow-hidden',
        className,
      )}
    >
      <ScrollArea
        orientation="horizontal"
        className="min-w-0 flex-1 h-full"
        viewportRef={tabsViewportRef}
      >
        <div
          data-pane-tabbar={pane}
          className="relative flex w-full h-14"
          role="tablist"
          aria-label={`${pane} pane tabs`}
          {...dropHandlers}
        >
          {isLinkDragging && linkDropIndicatorLeft != null && (
            <div
              className="absolute top-0 bottom-0 w-px bg-primary pointer-events-none z-50"
              style={{ left: linkDropIndicatorLeft }}
            />
          )}
          {paneTabs.map((tab, index) => (
            <Tab
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTab?.id}
              pane={pane}
              index={index}
            />
          ))}
          <TabBarContextMenu pane={pane}>
            <div
              ref={setTabBarEndSlotRef}
              className={cn('flex-1 -translate-x-px z-50 border-l border-transparent', {
                'border-l-primary': isOverTabBarEndSlot,
              })}
              aria-hidden
            />
          </TabBarContextMenu>
        </div>
      </ScrollArea>
      <div className="flex items-center gap-2 px-2 justify-center min-w-14 h-full border-l">
        <Tooltip>
          <TooltipTrigger asChild>
            {pane === 'primary' ? (
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                aria-label={splitLabel}
                disabled={!activeTab}
                onClick={handleOpenInSplit}
              >
                {isPortrait ? <SquareSplitVerticalIcon /> : <SquareSplitHorizontalIcon />}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                aria-label="Close Split View"
                disabled={!activeTab}
                onClick={closeSplit}
              >
                {isPortrait ? <PanelTopCloseIcon /> : <PanelRightCloseIcon />}
              </Button>
            )}
          </TooltipTrigger>
          <TooltipContent side="bottom">{splitLabel}</TooltipContent>
        </Tooltip>
        <div id="document-sidebar-trigger" className="md:hidden" />
      </div>
    </div>
  );
}
