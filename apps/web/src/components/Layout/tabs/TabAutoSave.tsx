/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useEffect, useRef } from 'react';
import { useSelector } from '@/store';

/**
 * Headless component that autosaves a dirty edit tab when the user switches
 * away from it. Dispatches a `save-request` custom event picked up by the
 * `useDocumentActions` instance mounted inside the corresponding `Tab`.
 */
export function TabAutoSave() {
  const activeTabId = useSelector((s) => s.tabs.activeTabId[s.tabs.activePane]);
  const tabList = useSelector((s) => s.tabs.tabList);
  const prevActiveTabIdRef = useRef(activeTabId);
  const tabListRef = useRef(tabList);

  useEffect(() => {
    tabListRef.current = tabList;
  }, [tabList]);

  useEffect(() => {
    const prevId = prevActiveTabIdRef.current;
    prevActiveTabIdRef.current = activeTabId;
    if (!prevId || prevId === activeTabId) return;
    const prevTab = tabListRef.current.find((t) => t.id === prevId);
    if (!prevTab) return;
    const isEditTab = prevTab.pathname.startsWith('/edit/');
    if (!isEditTab || !prevTab.isDirty) return;
    window.dispatchEvent(
      new CustomEvent('save-request', {
        detail: { tabId: prevTab.id, isAutosave: true },
      }),
    );
  }, [activeTabId]);

  return null;
}
