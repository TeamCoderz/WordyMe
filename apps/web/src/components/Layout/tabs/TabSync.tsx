/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useSelector, useActions } from '@/store';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { useDocumentActions } from '@/components/documents/useDocumentActions';
import { IS_APPLE } from '@repo/shared/environment';
import { isModifierMatch } from '@repo/shared/keyboard';
import { resolveModifier, useKeyHold } from '@tanstack/react-hotkeys';
import { matchTabLocation } from './utils';

let initialSyncCompleted = false;

/**
 * Headless component that handles:
 * - URL -> tab sync (opening tabs when the URL changes)
 * - Tab -> URL sync (navigating when the primary active tab changes)
 * - Keyboard shortcuts (close tab, save, alternate save) — applied to the globally active tab
 *
 * This component renders nothing. It should be mounted once inside the root layout.
 */
export function TabSync() {
  const navigate = useNavigate();
  const { openTab, closeTab, updateTab, setActiveTab } = useActions();

  const tabList = useSelector((state) => state.tabs.tabList);

  const activeTab = useSelector((state) =>
    state.tabs.tabList.find((t) => t.id === state.tabs.activeTabId[state.tabs.activePane]),
  );
  const primaryTabList = useSelector((state) =>
    state.tabs.tabList.filter((t) => state.tabs.primaryTabIds.includes(t.id)),
  );
  const secondaryTabList = useSelector((state) =>
    state.tabs.tabList.filter((t) => state.tabs.secondaryTabIds.includes(t.id)),
  );
  const isHomeTab = activeTab?.pathname === '/';
  const isLastTab = tabList.length === 1;
  const activePane = useSelector((state) => state.tabs.activePane);
  const isDocumentTab =
    activeTab?.pathname.startsWith('/edit/') || activeTab?.pathname.startsWith('/view/');
  const documentHandle = isDocumentTab
    ? decodeURIComponent(activeTab?.pathname.split('/').pop() ?? '')
    : null;

  const {
    isDisabled: isSaveDisabled,
    isPreviouslySaved,
    handleUpdate,
    handleSaveAsNewRevision,
    handleSaveAndOverwrite,
    editorSettings,
  } = useDocumentActions(documentHandle);

  const { pathname, search, hash } = useLocation();
  const isFirstLoad = useRef(true);
  const isModifierHeld = useKeyHold(resolveModifier('Mod'));
  const isShiftHeld = useKeyHold('Shift');

  const primaryTabListRef = useRef(primaryTabList);
  const secondaryTabListRef = useRef(secondaryTabList);
  const activePaneRef = useRef(activePane);
  const isModifierHeldRef = useRef(isModifierHeld);
  const isShiftHeldRef = useRef(isShiftHeld);
  useEffect(() => {
    primaryTabListRef.current = primaryTabList;
    secondaryTabListRef.current = secondaryTabList;
    activePaneRef.current = activePane;
    isModifierHeldRef.current = isModifierHeld;
    isShiftHeldRef.current = isShiftHeld;
  }, [primaryTabList, secondaryTabList, activePane, isModifierHeld, isShiftHeld]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a');
      if (!link) return;
      const { origin, pathname, searchParams, hash } = new URL(link.href);
      if (origin !== location.origin) return;
      const search = Object.fromEntries(searchParams.entries());
      const primaryTabList = primaryTabListRef.current;
      const secondaryTabList = secondaryTabListRef.current;
      const activePane = activePaneRef.current;
      const activePaneTabList = activePane === 'secondary' ? secondaryTabList : primaryTabList;
      const oppositePaneTabList = activePane === 'secondary' ? primaryTabList : secondaryTabList;
      const isModifierHeld = isModifierHeldRef.current;
      const isShiftHeld = isShiftHeldRef.current;
      const targetTabList = isShiftHeld ? oppositePaneTabList : activePaneTabList;
      const existingTab = targetTabList.find((t) => matchTabLocation(t, pathname, search, hash));
      const shouldOpenNewTab = isModifierHeld || link.dataset.newTab === 'true';
      const shouldSplitTab = isShiftHeld || link.dataset.newSplitTab === 'true';
      if (!(shouldOpenNewTab || shouldSplitTab || existingTab)) return;
      event.preventDefault();
      event.stopPropagation();
      if (existingTab && !isModifierHeld) {
        setActiveTab(existingTab.id);
      } else {
        const pane = shouldSplitTab ? 'opposite' : activePane;
        openTab({
          pathname,
          search,
          hash,
          pane,
        });
      }
    };
    document.addEventListener('click', handleClick, { capture: true });
    return () => {
      document.removeEventListener('click', handleClick, { capture: true });
    };
  }, []);

  // URL -> Tab sync: open a tab for the current URL on mount and update the active tab when location changes
  useEffect(() => {
    // don't open a tab if the id search param is true
    // it will be redirected to a handle
    if (search.id) return;
    if (pathname.startsWith('/login') || pathname.startsWith('/signup')) return;
    // on first load, open a tab if it doesn't exist otherwise set the active tab to the existing tab
    if (!initialSyncCompleted) {
      const existingTab = tabList.find((t) => matchTabLocation(t, pathname, search, hash));
      if (existingTab) setActiveTab(existingTab.id);
      else {
        openTab({
          pathname,
          search,
          hash,
          pane: 'primary',
          index: 0,
        });
      }
      initialSyncCompleted = true;
      return;
    }
    // skip updating the tab if it's the first load
    if (isFirstLoad.current) return;
    if (!activeTab) return;
    const locationMatches = matchTabLocation(activeTab, pathname, search, hash);
    if (locationMatches) return;
    const isEditTab = activeTab.pathname.startsWith('/edit/');
    const isViewTab = activeTab.pathname.startsWith('/view/');
    const isDocumentTab = isEditTab || isViewTab;
    updateTab(activeTab.id, {
      pathname,
      search,
      hash,
      isDirty: isDocumentTab ? undefined : false,
    });
  }, [pathname, search, hash, openTab]);

  useEffect(() => {
    if (isFirstLoad.current) return;
    if (tabList.length === 0) {
      openTab({
        pathname: '/',
        search: {},
        hash: '',
        pane: 'primary',
      });
    }
  }, [tabList.length, openTab]);

  useEffect(() => {
    return () => {
      isFirstLoad.current = true;
      requestAnimationFrame(() => {
        initialSyncCompleted = false;
      });
    };
  }, []);

  // Tab -> URL sync: navigate when the primary active tab changes
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    if (!activeTab) return;
    const locationMatches = matchTabLocation(activeTab, pathname, search, hash);
    if (locationMatches) return;
    navigate({
      to: activeTab.pathname,
      search: activeTab.search,
      hash: activeTab.hash,
    });
  }, [activeTab, navigate]);

  // Keyboard shortcuts: Close tab, Save, Alternate save — applied to the globally active tab
  useEffect(() => {
    const CONTROL_OR_META = { ctrlKey: !IS_APPLE, metaKey: IS_APPLE };

    const handleKeyDown = (event: KeyboardEvent) => {
      const { code } = event;

      if (code === 'KeyW' && isModifierMatch(event, { ...CONTROL_OR_META, altKey: true })) {
        if (activeTab && !(isHomeTab && isLastTab)) closeTab(activeTab.id);
      } else if (
        code === 'KeyS' &&
        isModifierMatch(event, { ...CONTROL_OR_META, shiftKey: true })
      ) {
        event.preventDefault();
        if (!isDocumentTab) return;
        if (isSaveDisabled || isPreviouslySaved) return;
        if (editorSettings?.keepPreviousRevision && !editorSettings?.autosave) {
          handleSaveAndOverwrite();
        } else {
          handleSaveAsNewRevision();
        }
      } else if (code === 'KeyS' && isModifierMatch(event, { ...CONTROL_OR_META })) {
        event.preventDefault();
        if (!isDocumentTab) return;
        handleUpdate(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [
    activeTab,
    closeTab,
    isDocumentTab,
    isSaveDisabled,
    isPreviouslySaved,
    editorSettings,
    handleUpdate,
    handleSaveAsNewRevision,
    handleSaveAndOverwrite,
  ]);

  return null;
}
