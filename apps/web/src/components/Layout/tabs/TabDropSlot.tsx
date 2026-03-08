/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { cn } from '@repo/ui/lib/utils';
import { useDroppable } from '@dnd-kit/core';

export const TAB_SLOT_PREFIX = 'tab-slot-';

export function tabSlotId(pane: 'primary' | 'secondary', index: number, side: 'left' | 'right') {
  return `${TAB_SLOT_PREFIX}${pane}-${index}-${side}`;
}

export function parseTabSlotId(
  id: string,
): { pane: 'primary' | 'secondary'; index: number } | null {
  if (!id.startsWith(TAB_SLOT_PREFIX)) return null;
  const rest = id.slice(TAB_SLOT_PREFIX.length);
  const [pane, indexStr] = rest.split('-');
  if (pane !== 'primary' && pane !== 'secondary') return null;
  const index = parseInt(indexStr ?? '', 10);
  if (Number.isNaN(index) || index < 0) return null;
  return { pane, index };
}

export interface TabDropSlotProps {
  pane: 'primary' | 'secondary';
  index: number;
}

/**
 * Droppable slot between tabs for cross-pane drag. Uses dnd-kit's useDroppable.
 * Shows a drop indicator (vertical line) when a tab from another pane is dragged over.
 */
export function TabDropSlot({ pane, index }: TabDropSlotProps) {
  const { setNodeRef: setLeftSlotRef, isOver: isOverLeft } = useDroppable({
    id: tabSlotId(pane, index, 'left'),
    data: { type: 'tab-slot', pane, index, side: 'left' },
  });
  const { setNodeRef: setRightSlotRef, isOver: isOverRight } = useDroppable({
    id: tabSlotId(pane, index, 'right'),
    data: { type: 'tab-slot', pane, index, side: 'right' },
  });
  return (
    <>
      <div
        ref={setLeftSlotRef}
        className={cn(
          'absolute left-0 w-1/2 h-full pointer-events-none z-50 border-l border-transparent',
          {
            'border-l-primary': isOverLeft,
            '-translate-x-px': index > 0,
          },
        )}
        aria-hidden
      />
      <div
        ref={setRightSlotRef}
        className={cn(
          'absolute right-0 w-1/2 h-full pointer-events-none z-50 border-r border-transparent translate-x-px',
          {
            'border-r-primary': isOverRight,
          },
        )}
        aria-hidden
      />
    </>
  );
}
