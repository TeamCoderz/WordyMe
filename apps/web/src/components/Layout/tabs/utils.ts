/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { Tab } from '@repo/types';
import type { DocumentLinkTarget } from '@/store/ui-slice';

export const matchTabLocation = (
  tab: Tab,
  pathname: string,
  search: Record<string, unknown>,
  hash: string,
) => {
  return (
    tab.pathname === pathname &&
    Object.keys(tab.search ?? {}).length === Object.keys(search ?? {}).length &&
    Object.keys(tab.search ?? {}).every(
      (key) => tab.search?.[key as keyof typeof tab.search] === search[key as keyof typeof search],
    ) &&
    (tab.hash ?? '') === (hash ?? '')
  );
};

/** Compare two Tab objects by full location (pathname + search + hash). */
export const tabsMatchLocation = (a: Tab, b: Tab): boolean =>
  matchTabLocation(a, b.pathname, b.search ?? {}, b.hash ?? '');

/** Find a tab in a specific pane that matches a full location. */
export const findTabInPane = (
  tabList: Tab[],
  paneTabIds: string[],
  pathname: string,
  search: Record<string, unknown> = {},
  hash: string = '',
): Tab | undefined =>
  tabList.find((t) => paneTabIds.includes(t.id) && matchTabLocation(t, pathname, search, hash));

export const getLocationFromDragEvent = (event: React.DragEvent | DragEvent) => {
  const target = event.target as HTMLElement | null;
  if (!target) return null;
  const link = target.closest('a');
  if (!link) return null;
  const { origin, pathname, searchParams, hash } = new URL(link.href);
  if (origin !== window.location.origin) return null;
  return {
    pathname,
    search: Object.fromEntries(searchParams.entries()) as Record<string, unknown>,
    hash: hash.slice(1),
  };
};

export const hasUrlInDataTransfer = (dataTransfer: DataTransfer | null) => {
  if (!dataTransfer) return false;
  return dataTransfer.types.includes('text/uri-list') || dataTransfer.types.length === 0;
};

export const getLocationFromDataTransfer = (dataTransfer: DataTransfer | null) => {
  if (!dataTransfer) return null;
  const uriList = dataTransfer.getData('text/uri-list');
  if (!uriList) return null;
  const url = uriList.split('\n')[0]?.trim();
  if (!url) return null;
  try {
    const { origin, pathname, searchParams, hash } = new URL(url);
    if (origin !== window.location.origin) return null;
    return {
      pathname,
      search: Object.fromEntries(searchParams.entries()) as Record<string, unknown>,
      hash: hash.slice(1),
    };
  } catch {
    return null;
  }
};
/**
 * Route prefixes where only one tab should exist at a time.
 * Navigating to any path under these prefixes reuses the existing tab.
 */
const SINGLETON_ROUTE_PREFIXES = ['/settings/'];

/**
 * Returns an existing tab that belongs to the same singleton group as `pathname`,
 * or `null` if no such tab exists or the route is not a singleton group.
 */
export const findGroupTab = (tabs: Tab[], pathname: string): Tab | null => {
  const prefix = SINGLETON_ROUTE_PREFIXES.find((p) => pathname.startsWith(p));
  if (!prefix) return null;
  return tabs.find((t) => t.pathname.startsWith(prefix)) ?? null;
};

export const matchAppLink = (tab: Tab, pathname: string) => {
  return pathname.split('/').length === 2 && tab.pathname.split('/')[1] === pathname.split('/')[1];
};

export const matchAppLocation = (tab: Tab, pathname: string) => {
  return tab.pathname.split('/')[1] === pathname.split('/')[1];
};

// ---------------------------------------------------------------------------
// resolveTabAction — shared tab-routing decision logic
// Used by both LinkButton and TabSync so behaviour stays in sync.
// ---------------------------------------------------------------------------

export interface ResolveTabActionInput {
  pathname: string;
  search: Record<string, unknown>;
  hash: string;
  primaryTabList: Tab[];
  secondaryTabList: Tab[];
  activePane: 'primary' | 'secondary';
  activeTab: Tab | undefined;
  isModifierHeld: boolean;
  isShiftHeld: boolean;
  newTab: boolean;
  newSplitTab: boolean;
  /** True when the clicked link lives inside document content (`.editor-input`). */
  isInDocument: boolean;
  documentLinkTarget: DocumentLinkTarget;
  splitTabsArePreview: boolean;
}

export type TabAction =
  | { type: 'activate'; tabId: string }
  | {
      type: 'activate-and-update';
      tabId: string;
      pathname: string;
      search: Record<string, unknown>;
      hash: string;
    }
  | {
      type: 'preview';
      pane: 'primary' | 'secondary' | 'opposite';
      pathname: string;
      search: Record<string, unknown>;
      hash: string;
    }
  | {
      type: 'navigate-in-place';
      tabId: string;
      pathname: string;
      search: Record<string, unknown>;
      hash: string;
      isDirty: boolean | undefined;
      requiresAutosave: boolean;
    }
  | {
      type: 'open-new';
      pane: 'primary' | 'secondary' | 'opposite';
      pathname: string;
      search: Record<string, unknown>;
      hash: string;
    };

/**
 * Pure function that resolves which tab action should be taken for a given
 * navigation intent. Contains the single source of truth for all tab routing
 * decisions — used by both LinkButton and TabSync.
 *
 * Fixes applied relative to the original per-callsite logic:
 * - `targetTabList` is derived from `shouldSplitTab` (not bare `isShiftHeld`)
 *   so the `newSplitTab` prop correctly influences which pane is searched.
 * - Group and same-path reuse branches are gated on `!shouldOpenNewTab &&
 *   !shouldSplitTab` so `newTab`/`newSplitTab` props always force new-tab
 *   creation even when a matching tab already exists.
 * - The exact-match (`existingTab`) branch is only gated on `!shouldOpenNewTab`,
 *   allowing split navigation to activate an existing tab in the target pane
 *   rather than creating a duplicate.
 * - When `documentLinkTarget` is 'split-view', Shift inverts for links inside
 *   document content: a plain click splits and Shift+Click stays in the current
 *   pane. An explicit `data-new-split-tab` still forces a split either way.
 * - Split opens are preview-eligible when `splitTabsArePreview` is set; the
 *   store scopes preview replacement per pane, so each pane keeps its own.
 */
export const resolveTabAction = ({
  pathname,
  search,
  hash,
  primaryTabList,
  secondaryTabList,
  activePane,
  activeTab,
  isModifierHeld,
  isShiftHeld,
  newTab,
  newSplitTab,
  isInDocument,
  documentLinkTarget,
  splitTabsArePreview,
}: ResolveTabActionInput): TabAction => {
  // Two different intents: `newTab` (the editor marks every in-document link
  // with data-new-tab) only means "never replace the document being read";
  // Ctrl/Cmd means "a permanent new tab". Both block in-place navigation, only
  // the modifier blocks preview and split-by-default.
  const shouldOpenNewTab = isModifierHeld || newTab;
  const splitByDefault = documentLinkTarget === 'split-view' && isInDocument && !isModifierHeld;
  const shouldSplitTab = (splitByDefault ? !isShiftHeld : isShiftHeld) || newSplitTab;

  const activePaneTabList = activePane === 'secondary' ? secondaryTabList : primaryTabList;
  const oppositePaneTabList = activePane === 'secondary' ? primaryTabList : secondaryTabList;
  // Fix: use shouldSplitTab so newSplitTab prop influences which pane is searched
  const targetTabList = shouldSplitTab ? oppositePaneTabList : activePaneTabList;

  const isViewLink = pathname.startsWith('/view/');
  // A same-pane open of a data-new-tab link stays a permanent tab, as before;
  // a split open is preview when the preference says so.
  const isPreviewEligible =
    isViewLink && !isModifierHeld && (shouldSplitTab ? splitTabsArePreview : !newTab);

  const existingTab =
    targetTabList.find((t) => matchTabLocation(t, pathname, search, hash)) ?? null;
  // Restrict group / same-path reuse to targetTabList only so that a normal click
  // never activates-and-updates a tab in the opposite pane.
  const existingGroupTab = !existingTab ? findGroupTab(targetTabList, pathname) : null;
  const existingTabSamePath =
    !existingTab && !existingGroupTab
      ? (targetTabList.find((t) => t.pathname === pathname) ?? null)
      : null;

  // Honor new-tab/new-split-tab requests across group and same-path reuse branches.
  // An exact-match tab in the target pane is activated unless Ctrl/Cmd forces a
  // new tab: a data-new-tab link only forbids replacing the reader's tab, and
  // activating the target's own tab does not — opening another would duplicate it.
  if (existingGroupTab && !shouldOpenNewTab && !shouldSplitTab) {
    return { type: 'activate-and-update', tabId: existingGroupTab.id, pathname, search, hash };
  } else if (existingTabSamePath && !shouldOpenNewTab && !shouldSplitTab) {
    return { type: 'activate-and-update', tabId: existingTabSamePath.id, pathname, search, hash };
  } else if (existingTab && !isModifierHeld) {
    return { type: 'activate', tabId: existingTab.id };
  } else if (isPreviewEligible) {
    return {
      type: 'preview',
      pane: shouldSplitTab ? 'opposite' : activePane,
      pathname,
      search,
      hash,
    };
  } else if (!(shouldOpenNewTab || shouldSplitTab) && activeTab) {
    const isDocumentLink = pathname.startsWith('/edit/') || pathname.startsWith('/view/');
    const requiresAutosave =
      activeTab.pathname.startsWith('/edit/') &&
      !!activeTab.isDirty &&
      pathname !== activeTab.pathname;
    return {
      type: 'navigate-in-place',
      tabId: activeTab.id,
      pathname,
      search,
      hash,
      isDirty: isDocumentLink ? undefined : activeTab.isDirty,
      requiresAutosave,
    };
  } else {
    const pane = shouldSplitTab ? 'opposite' : activePane;
    return { type: 'open-new', pane, pathname, search, hash };
  }
};
