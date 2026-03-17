/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useEffect, useRef } from 'react';
import { DocumentState } from '@embedpdf/core';
import { useViewManagerCapability, useAllViews } from '@embedpdf/plugin-view-manager/react';

interface TabContextMenuProps {
  documentState: DocumentState;
  currentViewId: string;
  position: { x: number; y: number };
  onClose: () => void;
}

export function TabContextMenu({
  documentState,
  currentViewId,
  position,
  onClose,
}: TabContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { provides: viewManager } = useViewManagerCapability();
  const allViews = useAllViews();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleOpenInNewView = () => {
    if (!viewManager) return;

    const newViewId = viewManager.createView();
    viewManager.addDocumentToView(newViewId, documentState.id);
    viewManager.removeDocumentFromView(currentViewId, documentState.id);
    viewManager.setFocusedView(newViewId);
    onClose();
  };

  const handleMoveToView = (targetViewId: string) => {
    if (!viewManager) return;
    viewManager.moveDocumentBetweenViews(currentViewId, targetViewId, documentState.id);
    viewManager.setFocusedView(targetViewId);
    viewManager.setViewActiveDocument(targetViewId, documentState.id);
    onClose();
  };

  const otherViews = allViews.filter((v) => v.id !== currentViewId);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-48 rounded-md border border-border bg-background shadow-lg"
      style={{ left: position.x, top: position.y }}
    >
      <div className="py-1">
        <button
          onClick={handleOpenInNewView}
          className="w-full px-4 py-2 text-left text-sm hover:bg-accent/75 hover:text-accent-foreground"
        >
          Open in New View
        </button>

        {otherViews.length > 0 && (
          <>
            <div className="my-1 border-t border-border" />
            <div className="px-4 py-1 text-xs font-semibold text-muted-foreground">
              Move to View
            </div>
            {otherViews.map((view, index) => (
              <button
                key={view.id}
                onClick={() => handleMoveToView(view.id)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-accent/75 hover:text-accent-foreground"
              >
                View {index + 2} ({view.documentIds.length} docs)
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
