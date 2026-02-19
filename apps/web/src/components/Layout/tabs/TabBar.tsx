/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { cn } from '@repo/ui/lib/utils';
import { useSelector, useActions } from '@/store';
import { Tab } from './Tab';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useCallback, useRef, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';

export interface TabBarProps {
  className?: string;
}

export function TabBar({ className }: TabBarProps) {
  const navigate = useNavigate();
  const { reorderTabs, openTab } = useActions();
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Get tabs state
  const tabs = useSelector((state) => state.tabs);
  const tabsList = tabs.tabs;
  const activeTabId = tabs.activeTabId;

  const { pathname, search, hash } = useLocation();
  const isFirstLoad = useRef(true);

  // Memoize tab IDs for SortableContext
  const tabIds = useMemo(() => tabsList.map((tab) => tab.id), [tabsList]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Open tab for current location on mount and when location changes
  useEffect(() => {
    // If the pathname is a UUID and the pathname starts with /edit or /view, don't open a tab
    if (search.id && (pathname.startsWith('/edit') || pathname.startsWith('/view'))) {
      return;
    }
    if (pathname.startsWith('/login') || pathname.startsWith('/signup')) {
      return;
    }
    openTab({ pathname, search, hash });
  }, [pathname, search, hash, openTab]);

  useEffect(() => {
    return () => {
      isFirstLoad.current = true;
    };
  }, []);

  // Navigate to active tab when it changes
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    if (tabsList.length === 0) {
      // No tabs, open home tab
      openTab({ pathname: '/' });
      navigate({ to: '/', replace: true });
      return;
    }

    const activeTab = tabsList.find((t) => t.id === activeTabId);
    if (!activeTab) return;
    if (activeTab.pathname !== pathname) {
      // Navigate to tab's path with search params and hash
      navigate({
        to: activeTab.pathname,
        search: activeTab.search ?? {},
        hash: activeTab.hash,
        replace: true,
      });
    }
  }, [activeTabId]);

  // Scroll active tab into view
  useEffect(() => {
    if (!activeTabId || !tabsContainerRef.current) return;

    const activeTabElement = tabsContainerRef.current.querySelector(
      `[data-tab-id="${activeTabId}"]`,
    );
    if (activeTabElement) {
      activeTabElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [activeTabId]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const oldIndex = tabIds.indexOf(active.id as string);
      const newIndex = tabIds.indexOf(over.id as string);

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderTabs(oldIndex, newIndex);
      }
    },
    [tabIds, reorderTabs],
  );

  // Handle mouse wheel to scroll horizontally
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (tabsContainerRef.current && e.deltaY !== 0) {
      e.preventDefault();
      e.stopPropagation();
      tabsContainerRef.current.scrollLeft += e.deltaY;
    }
  }, []);

  return (
    <div
      className={cn('flex h-full min-w-0 flex-1 overflow-x-auto scrollbar-hide', className)}
      role="tablist"
      aria-label="Document tabs"
      ref={tabsContainerRef}
      onWheel={handleWheel}
    >
      {/* Tabs container with DnD */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tabIds} strategy={horizontalListSortingStrategy}>
          {tabsList.map((tab) => (
            <Tab key={tab.id} tab={tab} isActive={tab.id === activeTabId} data-tab-id={tab.id} />
          ))}
        </SortableContext>
        <DragOverlay />
      </DndContext>
    </div>
  );
}
