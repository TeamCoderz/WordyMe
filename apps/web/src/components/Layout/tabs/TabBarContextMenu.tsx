/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@repo/ui/components/context-menu';
import { useActions, useSelector } from '@/store';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Plus,
  XCircle,
  SquareSplitVerticalIcon,
  SquareSplitHorizontalIcon,
  PanelRightCloseIcon,
  PanelTopCloseIcon,
} from '@repo/ui/components/icons';
import { useMediaQuery } from '@repo/ui/hooks/use-media-query';

export interface TabBarContextMenuProps {
  pane: 'primary' | 'secondary';
  children: ReactNode;
}

export function TabBarContextMenu({ pane, children }: TabBarContextMenuProps) {
  const { openTab, closeAllTabs, closeSplit } = useActions();
  const tabs = useSelector((state) => state.tabs);
  const activeTabId = tabs.activeTabId[pane];
  const activeTab = tabs.tabList.find((t) => t.id === activeTabId);
  const hasTabs = useSelector((state) => state.tabs.paneTabIds[pane].length > 0);
  const hasSplit = useSelector((state) => state.tabs.paneTabIds.secondary.length > 0);
  const isLastHomeTab = useSelector(
    (state) => state.tabs.tabList.length === 1 && state.tabs.tabList[0].pathname === '/',
  );
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const targetPane = pane === 'primary' ? 'secondary' : 'primary';
  const splitLabel =
    pane === 'primary'
      ? isPortrait
        ? 'Split Bottom'
        : 'Split Right'
      : isPortrait
        ? 'Split Top'
        : 'Split Left';

  const handleOpenInSplit = useCallback(() => {
    if (!activeTab) return;
    openTab({
      pathname: activeTab.pathname,
      search: activeTab.search,
      hash: activeTab.hash,
      pane: targetPane,
    });
  }, [activeTab, openTab, targetPane]);

  const handleNewTab = useCallback(() => {
    openTab({ pathname: '/', pane });
  }, [openTab, pane]);

  const [isMounted, setIsMounted] = useState(true);
  useEffect(() => {
    requestAnimationFrame(() => {
      setIsMounted(true);
    });
    return () => setIsMounted(false);
  }, []);

  if (!isMounted) return null;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={handleNewTab}>
          <Plus className="mr-2 size-4" />
          New Tab
        </ContextMenuItem>
        <ContextMenuItem onClick={closeAllTabs} disabled={!hasTabs || isLastHomeTab}>
          <XCircle className="mr-2 size-4" />
          Close All
        </ContextMenuItem>
        <ContextMenuItem onClick={handleOpenInSplit}>
          {isPortrait ? (
            <SquareSplitVerticalIcon className="mr-2 size-4" />
          ) : (
            <SquareSplitHorizontalIcon className="mr-2 size-4" />
          )}
          {splitLabel}
        </ContextMenuItem>
        {hasSplit && (
          <ContextMenuItem onClick={closeSplit}>
            {isPortrait ? (
              <PanelTopCloseIcon className="mr-2 size-4" />
            ) : (
              <PanelRightCloseIcon className="mr-2 size-4" />
            )}
            Close Split View
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
