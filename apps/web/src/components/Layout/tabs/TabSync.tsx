/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useSelector, useActions } from '@/store';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { resolveModifier, useKeyHold } from '@tanstack/react-hotkeys';
import { matchTabLocation, findGroupTab } from './utils';

/**
 * Headless component that handles:
 * - URL -> tab sync (opening tabs when the URL changes)
 * - Tab -> URL sync (navigating when the primary active tab changes)
 *
 * This component renders nothing. It should be mounted once inside the root layout.
 */
export function TabSync() {
  const navigate = useNavigate();
  const { openTab, updateTab, setActiveTab } = useActions();

  const tabList = useSelector((state) => state.tabs.tabList);

  const activeTab = useSelector((state) =>
    state.tabs.tabList.find((t) => t.id === state.tabs.activeTabId[state.tabs.activePane]),
  );
  const primaryTabList = useSelector((state) =>
    state.tabs.tabList.filter((t) => state.tabs.paneTabIds.primary.includes(t.id)),
  );
  const secondaryTabList = useSelector((state) =>
    state.tabs.tabList.filter((t) => state.tabs.paneTabIds.secondary.includes(t.id)),
  );
  const activePane = useSelector((state) => state.tabs.activePane);
  const isDocumentTab =
    activeTab &&
    (activeTab.pathname.startsWith('/edit/') || activeTab.pathname.startsWith('/view/'));
  const documentHandle = isDocumentTab
    ? decodeURIComponent(activeTab?.pathname.split('/').pop() ?? '')
    : null;

  const { pathname, search, hash } = useLocation();
  const isFirstLoad = useRef(true);
  const isModifierHeld = useKeyHold(resolveModifier('Mod'));
  const isShiftHeld = useKeyHold('Shift');

  const primaryTabListRef = useRef(primaryTabList);
  const secondaryTabListRef = useRef(secondaryTabList);
  const activePaneRef = useRef(activePane);
  const activeTabRef = useRef(activeTab);
  const isModifierHeldRef = useRef(isModifierHeld);
  const isShiftHeldRef = useRef(isShiftHeld);
  useEffect(() => {
    primaryTabListRef.current = primaryTabList;
    secondaryTabListRef.current = secondaryTabList;
    activePaneRef.current = activePane;
    activeTabRef.current = activeTab;
    isModifierHeldRef.current = isModifierHeld;
    isShiftHeldRef.current = isShiftHeld;
  }, [primaryTabList, secondaryTabList, activePane, activeTab, isModifierHeld, isShiftHeld]);

  useEffect(() => {
    const handleLinkClick = (event: MouseEvent) => {
      const link = event.currentTarget as HTMLAnchorElement;
      const { origin, pathname, searchParams, hash } = new URL(link.href);
      if (origin !== location.origin) return;
      if (link.download) return;
      const search = Object.fromEntries(searchParams.entries());
      const primaryTabList = primaryTabListRef.current;
      const secondaryTabList = secondaryTabListRef.current;
      const activePane = activePaneRef.current;
      const activePaneTabList = activePane === 'secondary' ? secondaryTabList : primaryTabList;
      const oppositePaneTabList = activePane === 'secondary' ? primaryTabList : secondaryTabList;
      const activeTab = activeTabRef.current;
      const isModifierHeld = isModifierHeldRef.current;
      const isShiftHeld = isShiftHeldRef.current;
      const targetTabList = isShiftHeld ? oppositePaneTabList : activePaneTabList;
      const allTabs = [...primaryTabList, ...secondaryTabList];
      const existingTab = targetTabList.find((t) => matchTabLocation(t, pathname, search, hash));
      const existingGroupTab = !existingTab ? findGroupTab(allTabs, pathname) : null;
      const existingTabSamePath =
        !existingTab && !existingGroupTab && allTabs.find((t) => t.pathname === pathname);
      const shouldOpenNewTab = isModifierHeld || link.dataset.newTab === 'true';
      const shouldSplitTab = isShiftHeld || link.dataset.newSplitTab === 'true';
      event.preventDefault();
      if (existingGroupTab && !isModifierHeld && !shouldSplitTab) {
        setActiveTab(existingGroupTab.id);
        updateTab(existingGroupTab.id, { pathname, search, hash: hash.slice(1) });
      } else if (existingTabSamePath && !isModifierHeld && !shouldSplitTab) {
        setActiveTab(existingTabSamePath.id);
        updateTab(existingTabSamePath.id, { search, hash: hash.slice(1) });
      } else if (!(shouldOpenNewTab || shouldSplitTab) && activeTab) {
        const isDocumentLink = pathname.startsWith('/edit/') || pathname.startsWith('/view/');
        updateTab(activeTab.id, {
          pathname,
          search,
          hash: hash.slice(1),
          isDirty: isDocumentLink ? undefined : activeTab.isDirty,
        });
      } else if (existingTab && !isModifierHeld) {
        setActiveTab(existingTab.id);
      } else {
        const pane = shouldSplitTab ? 'opposite' : activePane;
        openTab({
          pathname,
          search,
          hash: hash.slice(1),
          pane,
        });
      }
    };

    const attachToLink = (link: HTMLAnchorElement) => {
      link.addEventListener('click', handleLinkClick);
    };

    const detachFromLink = (link: HTMLAnchorElement) => {
      link.removeEventListener('click', handleLinkClick);
    };

    // Attach to all links currently in the DOM
    document.querySelectorAll<HTMLAnchorElement>('a').forEach(attachToLink);

    // Watch for links added/removed dynamically (portals, lazy renders, etc.)
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLAnchorElement) {
            attachToLink(node);
          } else if (node instanceof Element) {
            node.querySelectorAll<HTMLAnchorElement>('a').forEach(attachToLink);
          }
        }
        for (const node of mutation.removedNodes) {
          if (node instanceof HTMLAnchorElement) {
            detachFromLink(node);
          } else if (node instanceof Element) {
            node.querySelectorAll<HTMLAnchorElement>('a').forEach(detachFromLink);
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.querySelectorAll<HTMLAnchorElement>('a').forEach(detachFromLink);
      observer.disconnect();
    };
  }, []);

  // URL -> Tab sync: open a tab for the current URL on mount and update the active tab when location changes
  useEffect(() => {
    // don't open a tab if the id search param is true
    // it will be redirected to a handle
    if (search.id) return;
    if (pathname.startsWith('/login') || pathname.startsWith('/signup')) return;
    const locationMatches = activeTab && matchTabLocation(activeTab, pathname, search, hash);
    if (locationMatches) return;
    const existingTab = tabList.find((t) => matchTabLocation(t, pathname, search, hash));
    if (existingTab) return setActiveTab(existingTab.id);
    const existingGroupTab = findGroupTab(tabList, pathname);
    if (existingGroupTab) {
      if (existingGroupTab.id !== activeTab?.id) setActiveTab(existingGroupTab.id);
      updateTab(existingGroupTab.id, { pathname, search, hash });
      return;
    }
    const isSameDocument = isDocumentTab && pathname.split('/').pop() === documentHandle;
    const isSamePath = activeTab && activeTab.pathname === pathname;
    if (isSameDocument || isSamePath) {
      updateTab(activeTab.id, {
        pathname,
        search,
        hash,
      });
      return;
    } else {
      const rafId = requestAnimationFrame(() => {
        openTab({
          pathname,
          search,
          hash,
          pane: activePane,
          index: 0,
        });
      });
      return () => cancelAnimationFrame(rafId);
    }
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

  useEffect(() => {
    return () => {
      isFirstLoad.current = true;
    };
  }, []);

  return null;
}
