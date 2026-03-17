/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useCallback, useState } from 'react';
import { PANE_CONTENT_SPLIT_PRIMARY } from './PaneContent';
import { useActions } from '@/store';
import { getLocationFromDataTransfer, hasUrlInDataTransfer } from './utils';

export interface UseUrlDropOnPaneContentOptions {
  /** Called when a drop is successfully handled; use to reset parent state. */
  onDropHandled?: () => void;
}

/**
 * Open tabs when dropping external URLs (e.g. from address bar, bookmarks)
 * on the pane content area.
 *
 * Note: dnd-kit does not support external drag sources. External URL drops
 * require native HTML5 drag events (onDragOver, onDrop). This hook encapsulates
 * that logic for the pane content drop zones.
 */
export function useUrlDropOnPaneContent(
  pane: 'primary' | 'secondary',
  options?: UseUrlDropOnPaneContentOptions,
) {
  const { openTab, splitWithTabInPrimary } = useActions();
  const { onDropHandled } = options ?? {};
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    const hasLink = hasUrlInDataTransfer(e.dataTransfer);
    if (!hasLink) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      setIsDragging(false);

      const location = getLocationFromDataTransfer(e.dataTransfer);
      if (location === null) return;

      try {
        const { pathname, search, hash } = location;
        const overId = e.currentTarget.id;
        const shouldSplit = overId === PANE_CONTENT_SPLIT_PRIMARY;
        const tabId = openTab({
          pathname,
          search,
          hash,
          pane,
          background: shouldSplit,
        });
        if (shouldSplit) splitWithTabInPrimary(tabId);

        onDropHandled?.();
      } catch {
        return;
      }
    },
    [openTab, pane, onDropHandled, splitWithTabInPrimary],
  );

  const resetDragging = useCallback(() => setIsDragging(false), []);

  return {
    isDragging,
    resetDragging,
    dropHandlers: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}
