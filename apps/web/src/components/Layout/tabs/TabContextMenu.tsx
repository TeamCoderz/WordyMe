/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@repo/ui/components/context-menu';
import { useActions, useSelector } from '@/store';
import { useCallback, type ReactNode } from 'react';
import { toast } from 'sonner';
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
  PanelRightIcon,
  PanelRightCloseIcon,
  DownloadIcon,
  SquareSplitVerticalIcon,
  SquareSplitHorizontalIcon,
  PanelBottomIcon,
  PanelTopIcon,
  PanelLeftIcon,
  PanelTopCloseIcon,
} from '@repo/ui/components/icons';
import { useDocumentActions } from '@/components/documents/useDocumentActions';
import { IS_APPLE } from '@repo/shared/environment';
import { useMediaQuery } from '@repo/ui/hooks/use-media-query';

const SHORTCUTS = {
  close: IS_APPLE ? '⌘⌥W' : 'Ctrl+Alt+W',
  save: IS_APPLE ? '⌘S' : 'Ctrl+S',
  saveAlt: IS_APPLE ? '⌘⇧S' : 'Ctrl+Shift+S',
  closeOthers: IS_APPLE ? '⌘⌥T' : 'Ctrl+Alt+T',
  copyLink: IS_APPLE ? '⌘⇧C' : 'Ctrl+Shift+C',
} as const;

export interface TabContextMenuProps {
  tab: Tab;
  pane: 'primary' | 'secondary';
  children: ReactNode;
}

export function TabContextMenu({ tab, pane, children }: TabContextMenuProps) {
  const {
    openTab,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    moveTabToPane,
    closeSplit,
    setActiveTab,
    updateTab,
  } = useActions();
  const isActive = useSelector((state) => state.tabs.activeTabId[pane] === tab.id);
  const hasMultipleTabs = useSelector((state) => state.tabs.paneTabIds[pane].length > 1);
  const hasSplit = useSelector((state) => state.tabs.paneTabIds.secondary.length > 0);
  const isLastTab = useSelector((state) => state.tabs.tabList.length === 1);

  const isPortrait = useMediaQuery('(orientation: portrait)');
  const isHomeTab = tab.pathname === '/';
  const isEditTab = tab.pathname.startsWith('/edit/');
  const isViewTab = tab.pathname.startsWith('/view/');
  const isDocumentTab = isEditTab || isViewTab;
  const isAttachmentTab = tab.pathname === '/attachment';
  const documentHandle = isDocumentTab
    ? decodeURIComponent(tab.pathname.split('/').pop() ?? '')
    : null;

  const {
    isDisabled: isSaveDisabled,
    isPreviouslySaved,
    handleUpdate,
    handleSaveAsNewRevision,
    handleSaveAndOverwrite,
    handleExport,
    handlePrint,
    editorSettings,
  } = useDocumentActions(documentHandle, tab.id);

  // Close this tab
  const handleClose = useCallback(() => {
    closeTab(tab.id);
  }, [tab.id, closeTab]);

  // Close other tabs in the same pane
  const handleCloseOthers = useCallback(() => {
    closeOtherTabs(tab.id);
  }, [tab.id, closeOtherTabs]);

  // Close all tabs in all panes
  const handleCloseAll = useCallback(() => {
    closeAllTabs();
  }, [closeAllTabs]);

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
    openTab({
      pathname: tab.pathname,
      search: tab.search,
      hash: tab.hash,
      pane: targetPane,
    });
  }, [tab, openTab, targetPane]);

  const moveLabel =
    pane === 'primary'
      ? isPortrait
        ? 'Move to Bottom'
        : 'Move to Right'
      : isPortrait
        ? 'Move to Top'
        : 'Move to Left';

  // Move to the other pane
  const handleMoveToOtherPane = useCallback(() => {
    const targetPane = pane === 'primary' ? 'secondary' : 'primary';
    moveTabToPane(tab.id, targetPane);
  }, [tab.id, pane, moveTabToPane]);

  // Close the split (merge secondary tabs into primary)
  const handleCloseSplit = useCallback(() => {
    closeSplit();
  }, [closeSplit]);

  // Copy link with search params and hash
  const handleCopyPath = useCallback(() => {
    const searchParams =
      Object.keys(tab.search ?? {}).length > 0
        ? `?${new URLSearchParams(tab.search as Record<string, string>).toString()}`
        : '';
    const hash = tab.hash ? `#${tab.hash}` : '';
    navigator.clipboard.writeText(window.location.origin + tab.pathname + searchParams + hash);
  }, [tab.pathname, tab.search, tab.hash]);

  const handleView = useCallback(() => {
    if (!isEditTab || !documentHandle) return;
    updateTab(tab.id, { pathname: `/view/${documentHandle}` });
  }, [isEditTab, documentHandle, updateTab]);

  const handleEdit = useCallback(() => {
    if (!isViewTab || !documentHandle) return;
    updateTab(tab.id, { pathname: `/edit/${documentHandle}` });
  }, [isViewTab, documentHandle, updateTab]);

  const handleAttachmentDownload = useCallback(async () => {
    const url = tab.search?.url as string | undefined;
    const name = (tab.search?.name as string) ?? 'attachment';
    if (!url) {
      toast.error('Unable to download: No URL available');
      return;
    }
    const toastId = toast.loading(`Downloading ${name}...`);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch file');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success('Download started!', { id: toastId });
    } catch {
      toast.error('Failed to download attachment', { id: toastId });
    }
  }, [tab.search?.url, tab.search?.name]);

  return (
    <ContextMenu
      onOpenChange={(open) => {
        if (open) setActiveTab(tab.id);
      }}
    >
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {isDocumentTab && (
          <>
            <ContextMenuItem
              disabled={isSaveDisabled && !tab.isDirty}
              onClick={() => handleUpdate(false)}
            >
              <SaveIcon className="mr-2 size-4" />
              Save
              <ContextMenuShortcut>{SHORTCUTS.save}</ContextMenuShortcut>
            </ContextMenuItem>

            {editorSettings?.keepPreviousRevision && !editorSettings?.autosave && (
              <ContextMenuItem
                disabled={isSaveDisabled || isPreviouslySaved}
                onClick={handleSaveAndOverwrite}
              >
                <SaveIcon className="mr-2 size-4" />
                Overwrite
                <ContextMenuShortcut>{SHORTCUTS.saveAlt}</ContextMenuShortcut>
              </ContextMenuItem>
            )}

            {(!editorSettings?.keepPreviousRevision || editorSettings?.autosave) && (
              <ContextMenuItem
                disabled={isSaveDisabled || isPreviouslySaved}
                onClick={handleSaveAsNewRevision}
              >
                <SaveIcon className="mr-2 size-4" />
                New Revision
                <ContextMenuShortcut>{SHORTCUTS.saveAlt}</ContextMenuShortcut>
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
            <ContextMenuSeparator />
          </>
        )}
        {isAttachmentTab && (
          <>
            <ContextMenuItem onClick={handleAttachmentDownload}>
              <DownloadIcon className="mr-2 size-4" />
              Download
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}

        {/* Close actions */}
        <ContextMenuItem onClick={handleClose} disabled={isHomeTab && isLastTab}>
          <X className="mr-2 size-4" />
          Close
          <ContextMenuShortcut>{SHORTCUTS.close}</ContextMenuShortcut>
        </ContextMenuItem>
        {hasMultipleTabs && (
          <ContextMenuItem onClick={handleCloseOthers}>
            <XCircle className="mr-2 size-4" />
            Close Others
            <ContextMenuShortcut>{SHORTCUTS.closeOthers}</ContextMenuShortcut>
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={handleCloseAll} disabled={isHomeTab && isLastTab}>
          <XCircle className="mr-2 size-4" />
          Close All
        </ContextMenuItem>

        {/* Copy path */}
        <ContextMenuItem onClick={handleCopyPath}>
          <Copy className="mr-2 size-4" />
          Copy Link
          <ContextMenuShortcut>{SHORTCUTS.copyLink}</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Pane actions */}
        <ContextMenuItem onClick={handleOpenInSplit}>
          {isPortrait ? (
            <SquareSplitVerticalIcon className="mr-2 size-4" />
          ) : (
            <SquareSplitHorizontalIcon className="mr-2 size-4" />
          )}
          {splitLabel}
        </ContextMenuItem>
        <ContextMenuItem onClick={handleMoveToOtherPane}>
          {isPortrait ? (
            pane === 'primary' ? (
              <PanelBottomIcon className="mr-2 size-4" />
            ) : (
              <PanelTopIcon className="mr-2 size-4" />
            )
          ) : pane === 'primary' ? (
            <PanelRightIcon className="mr-2 size-4" />
          ) : (
            <PanelLeftIcon className="mr-2 size-4" />
          )}
          {moveLabel}
        </ContextMenuItem>
        {hasSplit && (
          <ContextMenuItem onClick={handleCloseSplit}>
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
