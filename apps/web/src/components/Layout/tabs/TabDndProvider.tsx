/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useCallback, useState, type ReactNode } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useActions, useSelector } from '@/store';
import { parseTabSlotId } from './TabDropSlot';
import { PANE_CONTENT_SPLIT_PRIMARY, PANE_CONTENT_SPLIT_SECONDARY } from './PaneContent';
import { TabDragPreview } from './Tab';
import type { Tab as TabType } from '@repo/types';

interface TabDndProviderProps {
  children: ReactNode;
}

export function TabDndProvider({ children }: TabDndProviderProps) {
  const { reorderTabs, moveTabToPane, splitWithTabInPrimary, openTab } = useActions();
  const tabs = useSelector((state) => state.tabs);
  const [activeTab, setActiveTab] = useState<TabType | null>(null);

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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as { type?: string; tab?: TabType } | undefined;
    if (data?.type === 'tab' && data.tab) {
      setActiveTab(data.tab);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTab(null);

      const { active, over } = event;

      if (!over) return;

      const activeTabId = active.id as string;
      const activeData = active.data.current as
        | { type: string; pane: 'primary' | 'secondary' }
        | undefined;
      const overId = String(over.id);
      const overData = over.data.current as
        | {
            type: string;
            pane?: 'primary' | 'secondary';
            tab?: { id: string };
          }
        | undefined;

      if (!activeData) return;

      const sourcePane = activeData.pane;

      // Check for tab-slot drop (dnd-kit droppable slots)
      const slotParsed = parseTabSlotId(overId);
      if (slotParsed) {
        if (slotParsed.pane !== sourcePane) {
          moveTabToPane(activeTabId, slotParsed.pane, slotParsed.index);
        } else {
          // Same pane: reorder to slot index
          const ids = slotParsed.pane === 'primary' ? tabs.primaryTabIds : tabs.secondaryTabIds;
          const oldIndex = ids.indexOf(activeTabId);
          const newIndex = Math.min(slotParsed.index, ids.length);
          if (oldIndex !== -1 && oldIndex !== newIndex) {
            reorderTabs(slotParsed.pane, oldIndex, newIndex);
          }
        }
        return;
      }

      // Determine target pane and insert index from other drop targets
      let targetPane: 'primary' | 'secondary' | undefined;
      let dropIndex: number | undefined;

      if (overId.startsWith('pane-tabbar-')) {
        targetPane = overId.replace('pane-tabbar-', '') as 'primary' | 'secondary';
        dropIndex =
          targetPane === 'primary' ? tabs.primaryTabIds.length : tabs.secondaryTabIds.length;
      } else if (overId === PANE_CONTENT_SPLIT_PRIMARY) {
        if (tabs.tabList.length === 1) {
          const activeTab = tabs.tabList[0];
          openTab({
            pathname: activeTab.pathname,
            search: activeTab.search,
            hash: activeTab.hash,
            pane: 'secondary',
          });
        }
        splitWithTabInPrimary(activeTabId);
        return;
      } else if (overId === PANE_CONTENT_SPLIT_SECONDARY) {
        if (tabs.tabList.length === 1) {
          const activeTab = tabs.tabList[0];
          openTab({
            pathname: activeTab.pathname,
            search: activeTab.search,
            hash: activeTab.hash,
            pane: 'primary',
          });
        }
        moveTabToPane(activeTabId, 'secondary');
        return;
      } else if (overId.startsWith('pane-content-')) {
        const contentPane = overId.replace('pane-content-', '') as 'primary' | 'secondary';
        targetPane = contentPane;
        dropIndex = undefined; // append
      } else if (overData?.type === 'tab') {
        targetPane = overData.pane as 'primary' | 'secondary' | undefined;
        const ids = targetPane === 'primary' ? tabs.primaryTabIds : tabs.secondaryTabIds;
        dropIndex = ids.indexOf(over.id as string);
        if (dropIndex === -1) dropIndex = ids.length;
      }

      if (!targetPane) return;

      if (sourcePane === targetPane) {
        // Same pane: reorder
        if (active.id === over.id) return;

        const ids = targetPane === 'primary' ? tabs.primaryTabIds : tabs.secondaryTabIds;
        const oldIndex = ids.indexOf(activeTabId);
        const newIndex = overData?.type === 'tab' ? ids.indexOf(over.id as string) : ids.length;

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          reorderTabs(targetPane, oldIndex, newIndex);
        }
      } else {
        // Cross-pane: move tab to the other pane
        moveTabToPane(activeTabId, targetPane, dropIndex);
      }
    },
    [tabs.primaryTabIds, tabs.secondaryTabIds, reorderTabs, moveTabToPane, splitWithTabInPrimary],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTab(null)}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {activeTab && <TabDragPreview tab={activeTab} />}
      </DragOverlay>
    </DndContext>
  );
}
