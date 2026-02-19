/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@repo/ui/components/context-menu';
import { useActions, useSelector } from '@/store';
import { useCallback, type ReactNode } from 'react';
import type { Tab } from '@repo/types';
import {
  X,
  XCircle,
  Copy,
  SaveIcon,
  PrinterIcon,
  FileOutputIcon,
  EyeIcon,
  PencilIcon,
} from '@repo/ui/components/icons';
import { useDocumentActions } from './useDocumentActions';
import { useNavigate } from '@tanstack/react-router';

export interface TabContextMenuProps {
  tab: Tab;
  children: ReactNode;
}

export function TabContextMenu({ tab, children }: TabContextMenuProps) {
  const { closeTab, closeOtherTabs, closeAllTabs } = useActions();
  const navigate = useNavigate();
  const isActive = useSelector((state) => state.tabs.activeTabId === tab.id);
  const tabs = useSelector((state) => state.tabs);
  const hasMultipleTabs = tabs.tabs.length > 1;

  const isEditTab = tab.pathname.startsWith('/edit/');
  const isViewTab = tab.pathname.startsWith('/view/');
  const isDocumentTab = isEditTab || isViewTab;
  const documentHandle = isDocumentTab ? tab.pathname.split('/').pop()! : null;

  const {
    isDisabled: isSaveDisabled,
    isPreviouslySaved,
    handleUpdate,
    handleSaveAsNewRevision,
    handleSaveAndOverwrite,
    handleExport,
    handlePrint,
    editorSettings,
  } = useDocumentActions(documentHandle);

  // Close this tab
  const handleClose = useCallback(() => {
    closeTab(tab.id);
    // Navigation is handled by TabBar effect on activeTabId change
  }, [tab.id, closeTab]);

  // Close other tabs
  const handleCloseOthers = useCallback(() => {
    closeOtherTabs(tab.id);
  }, [tab.id, closeOtherTabs]);

  // Close all tabs
  const handleCloseAll = useCallback(() => {
    closeAllTabs();
    // Navigation is handled by TabBar effect on activeTabId change
  }, [closeAllTabs]);

  // Copy link with search params and hash
  const handleCopyPath = useCallback(() => {
    const searchParams = tab.search
      ? '?' + new URLSearchParams(tab.search as Record<string, string>).toString()
      : '';
    const hash = tab.hash ? tab.hash : '';
    navigator.clipboard.writeText(window.location.origin + tab.pathname + searchParams + hash);
  }, [tab.pathname, tab.search, tab.hash]);

  const handleView = useCallback(() => {
    if (!isEditTab || !documentHandle) return;
    navigate({
      to: '/view/$handle',
      params: { handle: documentHandle },
    });
  }, [isEditTab, documentHandle, navigate]);

  const handleEdit = useCallback(() => {
    if (!isViewTab || !documentHandle) return;
    navigate({
      to: '/edit/$handle',
      params: { handle: documentHandle },
    });
  }, [isViewTab, documentHandle, navigate]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {/* Close actions */}
        <ContextMenuItem onClick={handleClose}>
          <X className="mr-2 size-4" />
          Close
        </ContextMenuItem>
        {hasMultipleTabs && (
          <ContextMenuItem onClick={handleCloseOthers}>
            <XCircle className="mr-2 size-4" />
            Close Others
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={handleCloseAll}>
          <XCircle className="mr-2 size-4" />
          Close All
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Copy path */}
        <ContextMenuItem onClick={handleCopyPath}>
          <Copy className="mr-2 size-4" />
          Copy Link
        </ContextMenuItem>

        {isDocumentTab && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              disabled={isSaveDisabled && !tab.isDirty}
              onClick={() => handleUpdate(false)}
            >
              <SaveIcon className="mr-2 size-4" />
              Save
            </ContextMenuItem>

            {editorSettings?.keepPreviousRevision && !editorSettings?.autosave && (
              <ContextMenuItem
                disabled={isSaveDisabled || isPreviouslySaved}
                onClick={handleSaveAndOverwrite}
              >
                <SaveIcon className="mr-2 size-4" />
                Save and overwrite
              </ContextMenuItem>
            )}

            {(!editorSettings?.keepPreviousRevision || editorSettings?.autosave) && (
              <ContextMenuItem
                disabled={isSaveDisabled || isPreviouslySaved}
                onClick={handleSaveAsNewRevision}
              >
                <SaveIcon className="mr-2 size-4" />
                Save as new revision
              </ContextMenuItem>
            )}

            <ContextMenuSeparator />

            {isEditTab && (
              <ContextMenuItem onClick={handleView}>
                <EyeIcon className="mr-2 size-4" />
                View
              </ContextMenuItem>
            )}
            {isViewTab && (
              <>
                <ContextMenuItem onClick={handleEdit}>
                  <PencilIcon className="mr-2 size-4" />
                  Edit
                </ContextMenuItem>
              </>
            )}
            <ContextMenuItem onClick={handleExport}>
              <FileOutputIcon className="mr-2 size-4" />
              Export
            </ContextMenuItem>

            <ContextMenuItem onClick={handlePrint} disabled={!isActive}>
              <PrinterIcon className="mr-2 size-4" />
              Print
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
