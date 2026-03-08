/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useCallback, useState } from 'react';
import { useActions } from '@/store';
import { hasUrlInDataTransfer } from './utils';

/**
 * VSCode-like: open tabs when dropping external URLs (e.g. from address bar,
 * bookmarks) on the tab bar.
 *
 * Note: dnd-kit does not support external drag sources. It only handles items
 * registered via useDraggable/useSortable within DndContext. External URL drops
 * require native HTML5 drag events (onDragOver, onDrop). This hook encapsulates
 * that logic.
 */
export function useUrlDropOnTabBar(
  pane: 'primary' | 'secondary',
  containerRef: React.RefObject<HTMLDivElement | null>,
  tabCount: number,
) {
  const [dropIndicatorLeft, setDropIndicatorLeft] = useState<number | null>(null);
  const { openTab } = useActions();
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      const hasLink = hasUrlInDataTransfer(e.dataTransfer);
      if (!hasLink) return;

      const url = e.dataTransfer.getData('text/uri-list')?.split('\n')[0]?.trim();
      if (url) {
        try {
          if (new URL(url).origin !== window.location.origin) return;
        } catch {
          return;
        }
      }

      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      const container = containerRef.current;
      if (container) {
        const tabElements = container.querySelectorAll('[data-tab-id]');
        const rect = container.getBoundingClientRect();
        let insertIndex = tabElements.length;
        for (let i = 0; i < tabElements.length; i++) {
          const tabRect = tabElements[i].getBoundingClientRect();
          const mid = tabRect.left + tabRect.width / 2;
          if (e.clientX < mid) {
            insertIndex = i;
            break;
          }
          insertIndex = i + 1;
        }
        const left =
          tabElements.length === 0
            ? 0
            : insertIndex === 0
              ? 0
              : insertIndex < tabElements.length
                ? tabElements[insertIndex].getBoundingClientRect().left -
                  rect.left +
                  container.scrollLeft
                : tabElements[tabElements.length - 1].getBoundingClientRect().right -
                  rect.left +
                  container.scrollLeft;
        setDropIndicatorLeft(left);
      } else {
        setDropIndicatorLeft(0);
      }
    },
    [containerRef, openTab],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropIndicatorLeft(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      setDropIndicatorLeft(null);
      const uriList = e.dataTransfer.getData('text/uri-list')?.split('\n')[0]?.trim();
      const plainText = e.dataTransfer.getData('text/plain')?.trim();
      const url = uriList || (plainText?.startsWith('http') ? plainText : null);
      if (!url) return;

      try {
        const { pathname, searchParams, hash, origin } = new URL(url);
        if (origin !== window.location.origin) return;

        e.preventDefault();
        e.stopPropagation();

        let insertIndex = tabCount;
        const container = containerRef.current;
        if (container) {
          const tabElements = container.querySelectorAll('[data-tab-id]');
          for (let i = 0; i < tabElements.length; i++) {
            const rect = tabElements[i].getBoundingClientRect();
            const mid = rect.left + rect.width / 2;
            if (e.clientX < mid) {
              insertIndex = i;
              break;
            }
            insertIndex = i + 1;
          }
        }

        openTab({
          pathname,
          search: Object.fromEntries(searchParams.entries()) as Record<string, unknown>,
          hash: hash.slice(1),
          pane,
          index: insertIndex,
        });
      } catch {
        return;
      }
    },
    [openTab, pane, tabCount, containerRef],
  );

  return {
    dropIndicatorLeft,
    dropHandlers: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}
