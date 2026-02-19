/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { cn } from '@repo/ui/lib/utils';
import { DotIcon, XIcon, Loader2Icon, CheckCheckIcon, SaveIcon } from '@repo/ui/components/icons';
import { Button } from '@repo/ui/components/button';
import { DynamicIcon } from '@repo/ui/components/dynamic-icon';
import type { Tab as TabType } from '@repo/types';
import { useActions } from '@/store';
import { forwardRef, useCallback, type MouseEvent, type CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TabContextMenu } from './TabContextMenu';
import { useTabMetadata } from './useTabMetadata';
import { useDocumentActions } from './useDocumentActions';

export interface TabProps {
  tab: TabType;
  isActive: boolean;
}

export const Tab = forwardRef<HTMLDivElement, TabProps>(({ tab, isActive, ...props }, ref) => {
  const { closeTab, setActiveTab } = useActions();
  const { title, icon } = useTabMetadata(tab.pathname);
  const isEditTab = tab.pathname.startsWith('/edit/');
  const isViewTab = tab.pathname.startsWith('/view/');
  const isDocumentTab = isEditTab || isViewTab;
  const documentHandle = isDocumentTab ? tab.pathname.split('/').pop()! : null;
  const { isSaving, isJustSaved, handleUpdate } = useDocumentActions(documentHandle);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tab.id,
    data: {
      type: 'tab',
      tab,
    },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : undefined,
  };

  const handleClick = useCallback(() => {
    setActiveTab(tab.id);
    // Navigation is handled by TabBar effect on activeTabId change
  }, [tab.id, setActiveTab]);

  const handleClose = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      closeTab(tab.id);
      // Navigation is handled by TabBar effect on activeTabId change
    },
    [tab.id, closeTab],
  );

  const handleMiddleClick = useCallback(
    (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        closeTab(tab.id);
        // Navigation is handled by TabBar effect on activeTabId change
      }
    },
    [tab.id, closeTab],
  );

  return (
    <TabContextMenu tab={tab}>
      <div
        ref={(node) => {
          setNodeRef(node);
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        onClick={handleClick}
        onMouseDown={handleMiddleClick}
        style={style}
        className={cn(
          'group group/tab relative flex h-full min-w-32 w-48 cursor-grab items-center gap-1.5 rounded-t-md border border-b-0 px-3 transition-colors',
          'hover:bg-muted/50',
          isActive
            ? 'bg-background border-border z-10 shadow-sm'
            : 'bg-muted/30 border-transparent',
          isDragging && 'opacity-50 shadow-lg cursor-grabbing',
        )}
        {...attributes}
        {...listeners}
        {...props}
        role="tab"
        aria-selected={isActive}
        tabIndex={isActive ? 0 : -1}
      >
        {/* Tab icon */}
        <span className="shrink-0 text-muted-foreground">
          <DynamicIcon name={icon ?? undefined} className="size-4" />
        </span>

        {/* Tab title */}
        <span className="flex-1 truncate text-sm font-medium" title={title}>
          {title}
        </span>

        {/* Combined save/close button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'size-5 shrink-0 rounded-sm p-0 opacity-0 transition-opacity group-hover/tab:opacity-100 max-md:opacity-100',
            {
              'opacity-100': isActive || tab.isDirty,
              'hover:bg-destructive/10 hover:text-destructive': !isDocumentTab || !tab.isDirty,
              'hover:bg-green-500/10 hover:text-green-500':
                isDocumentTab && (tab.isDirty || isSaving || isJustSaved),
            },
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (tab.isDirty) {
              handleUpdate(false);
            } else {
              handleClose(e);
            }
          }}
          title={isDocumentTab && tab.isDirty ? 'Save' : 'Close'}
        >
          {isDocumentTab ? (
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
                    isActive ? 'text-primary bg-primary' : 'text-primary/50 bg-primary/50',
                  )}
                />
                <SaveIcon className="size-3.5 hidden group-hover/tab:block" />
              </>
            )
          ) : (
            <XIcon className="size-3" />
          )}
        </Button>

        {/* Active indicator line */}
        {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
      </div>
    </TabContextMenu>
  );
});

Tab.displayName = 'Tab';
