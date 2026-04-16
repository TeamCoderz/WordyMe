/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { cn } from '@repo/ui/lib/utils';
import { DotIcon, XIcon, Loader2Icon, CheckCheckIcon, SaveIcon } from '@repo/ui/components/icons';
import { Button } from '@repo/ui/components/button';
import { DynamicIcon } from '@repo/ui/components/dynamic-icon';
import type { Tab as TabType } from '@repo/types';
import { useActions, useSelector } from '@/store';
import { useCallback, type MouseEvent } from 'react';
import { TabContextMenu } from './TabContextMenu';
import { useTabMetadata } from './useTabMetadata';
import { useDocumentActions } from '@/components/documents/useDocumentActions';
import { TabDropSlot } from './TabDropSlot';
import { useSortable } from '@dnd-kit/sortable';
import { useHotkey } from '@tanstack/react-hotkeys';
import { alert } from '@/components/Layout/alert';

const TabIcon = ({ name }: { name: string | undefined }) => {
  switch (name) {
    default:
      return <DynamicIcon name={name ?? undefined} className="size-4" />;
  }
};

export function TabDragPreview({ tab }: { tab: TabType }) {
  const { title, icon } = useTabMetadata(tab);
  return (
    <div
      className={cn(
        'flex h-14 min-w-32 w-48 cursor-grabbing items-center gap-1.5 bg-background px-3 shadow-lg ring-1 ring-border/50',
      )}
    >
      <span className="shrink-0 text-muted-foreground">
        <TabIcon name={icon ?? undefined} />
      </span>
      <span
        className={cn('flex-1 truncate text-sm font-medium', { italic: tab.isPreview })}
        title={title}
      >
        {title}
      </span>
    </div>
  );
}

export interface TabProps {
  tab: TabType;
  isActive: boolean;
  pane: 'primary' | 'secondary';
  index: number;
}

export const Tab = ({ tab, isActive, pane, index }: TabProps) => {
  const { closeTab, setActiveTab, promoteTab } = useActions();
  const activePane = useSelector((state) => state.tabs.activePane);
  const { title, icon } = useTabMetadata(tab);
  const isHomeTab = tab.pathname === '/';
  const isLastTab = useSelector((state) => state.tabs.tabList.length === 1);
  const isEditTab = tab.pathname.startsWith('/edit/');
  const isViewTab = tab.pathname.startsWith('/view/');
  const isDocumentTab = isEditTab || isViewTab;
  const documentHandle = isDocumentTab
    ? decodeURIComponent(tab.pathname.split('/').pop() ?? '')
    : null;
  const { isSaving, isJustSaved, handleUpdate } = useDocumentActions(documentHandle, tab.id, {
    listenForSaveRequests: true,
  });

  const { attributes, listeners, setNodeRef } = useSortable({
    id: tab.id,
    data: {
      type: 'tab',
      tab,
      pane,
    },
  });

  const handleClick = useCallback(() => {
    setActiveTab(tab.id);
  }, [tab.id, setActiveTab]);

  const confirmAndClose = useCallback(async () => {
    if (isEditTab && tab.isDirty) {
      const ok = await alert({
        title: 'Unsaved changes',
        description: 'This page has unsaved changes. Close anyway?',
        confirmText: 'Close anyway',
        cancelText: 'Cancel',
        buttonVariant: 'destructive',
      });
      if (!ok) return;
    }
    closeTab(tab.id);
  }, [isEditTab, tab.isDirty, tab.id, closeTab]);

  const handleClose = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      void confirmAndClose();
    },
    [confirmAndClose],
  );

  const handleMiddleClick = useCallback(
    (e: MouseEvent) => {
      if (e.button === 1 && !(isHomeTab && isLastTab)) {
        e.preventDefault();
        void confirmAndClose();
      }
    },
    [confirmAndClose, isHomeTab, isLastTab],
  );

  const isActiveTab = isActive && pane === activePane;
  useHotkey({ key: (index + 1).toString(), mod: true, alt: true }, () => setActiveTab(tab.id), {
    enabled: pane === activePane,
    conflictBehavior: 'replace',
  });

  useHotkey({ key: (index + 1).toString(), mod: true, shift: true }, () => setActiveTab(tab.id), {
    enabled: pane !== activePane,
    conflictBehavior: 'replace',
  });

  return (
    <TabContextMenu tab={tab} pane={pane}>
      <div
        ref={setNodeRef}
        data-tab-id={tab.id}
        onClick={handleClick}
        onMouseDown={handleMiddleClick}
        onDoubleClick={() => {
          if (tab.isPreview) promoteTab(tab.id);
        }}
        className={cn(
          'group group/tab relative flex h-full min-w-32 w-48 cursor-grab items-center gap-1.5 border-r border-b px-3 transition-colors bg-sidebar',
          'hover:bg-muted/50',
          isActive && 'bg-background border-b-0',
        )}
        {...attributes}
        {...listeners}
        role="tab"
        aria-selected={isActiveTab}
        tabIndex={isActiveTab ? 0 : -1}
      >
        <TabDropSlot pane={pane} index={index} />
        {/* Tab icon */}
        <span className={cn('shrink-0 text-muted-foreground', isActiveTab && 'text-foreground')}>
          <TabIcon name={icon ?? undefined} />
        </span>

        {/* Tab title */}
        <span
          className={cn('flex-1 truncate text-sm font-medium', {
            'text-muted-foreground': !isActiveTab,
            italic: tab.isPreview,
          })}
          title={title}
        >
          {title}
        </span>

        {/* Combined save/close button (hidden for home tab) */}
        {isActiveTab || (isEditTab && (isSaving || isJustSaved)) ? (
          <Button
            variant="ghost"
            size="icon"
            disabled={isHomeTab && isLastTab}
            className={cn('size-5 shrink-0 rounded-sm p-0 opacity-100 transition-opacity', {
              'opacity-0!': isHomeTab && isLastTab,
              'hover:bg-green-500/10 hover:text-green-500':
                isEditTab && (tab.isDirty || isSaving || isJustSaved),
            })}
            onClick={(e) => {
              e.stopPropagation();
              if (isEditTab && tab.isDirty) {
                handleUpdate(false);
              } else {
                void confirmAndClose();
              }
            }}
            title={isEditTab && tab.isDirty ? 'Save' : 'Close'}
          >
            {isEditTab ? (
              isSaving ? (
                <Loader2Icon className="size-3 animate-spin" />
              ) : isJustSaved ? (
                <CheckCheckIcon className="size-3 text-green-500" />
              ) : !tab.isDirty ? (
                <XIcon className="size-3" />
              ) : (
                <>
                  <DotIcon
                    className={cn(
                      'size-2 rounded-full group-hover/tab:hidden',
                      isActiveTab
                        ? 'text-yellow-500 bg-yellow-500'
                        : 'text-yellow-500/50 bg-yellow-500/50',
                    )}
                  />
                  <SaveIcon className="size-3.5 hidden group-hover/tab:block" />
                </>
              )
            ) : (
              <XIcon className="size-3" />
            )}
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            disabled={isHomeTab && isLastTab}
            className={cn(
              'size-5 shrink-0 rounded-sm p-0 opacity-0 transition-opacity group-hover/tab:opacity-100 max-md:opacity-100',
              { 'opacity-0!': isHomeTab && isLastTab },
            )}
            onClick={handleClose}
            title="Close"
          >
            <XIcon className="size-3" />
          </Button>
        )}

        {/* Active indicator line */}
        {isActive && (
          <span
            className={cn(
              'absolute top-0 left-0 right-0 h-0.5',
              pane === activePane ? 'bg-primary' : 'bg-primary/20',
            )}
          />
        )}
      </div>
    </TabContextMenu>
  );
};
