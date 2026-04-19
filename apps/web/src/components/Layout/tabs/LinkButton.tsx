/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as React from 'react';
import {
  useNavigate,
  useRouter,
  type AnyRouter,
  type RegisteredRouter,
  type LinkOptions,
} from '@tanstack/react-router';
import { useSelector, useActions } from '@/store';
import { matchTabLocation, findGroupTab } from './utils';

type ValidRouteProps<
  TRouter extends AnyRouter = RegisteredRouter,
  TFrom extends string = string,
  TTo extends string | undefined = undefined,
> = Pick<LinkOptions<TRouter, TFrom, TTo>, 'to' | 'params' | 'search' | 'hash'>;

export interface LinkButtonProps<
  TRouter extends AnyRouter = RegisteredRouter,
  TFrom extends string = string,
  TTo extends string | undefined = undefined,
>
  extends
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>,
    Omit<ValidRouteProps<TRouter, TFrom, TTo>, 'to'> {
  /** Route path — validated against all registered routes at compile time */
  to: NonNullable<ValidRouteProps<TRouter, TFrom, TTo>['to']>;
  className?: string;
  /** Force open in a new tab in the same pane — equivalent to Ctrl/Cmd+Click */
  newTab?: boolean;
  /** Force open in the opposite (split) pane — equivalent to Shift+Click */
  newSplitTab?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

/**
 * A button that navigates with the same tab-aware logic as intercepted <a> links in TabSync.
 *
 * Behaviour matrix (mirrors TabSync.handleLinkClick):
 *   Default click     → navigate current tab in place (or switch to existing tab)
 *   Ctrl/Cmd+Click    → open new tab in same pane
 *   Shift+Click       → open in opposite (split) pane
 *   newTab prop       → always open new tab (like data-new-tab="true" on <a>)
 *   newSplitTab prop  → always open in split pane (like data-new-split-tab="true" on <a>)
 *
 * Uses React.forwardRef so Radix's Slot (e.g. DropdownMenuItem asChild) can merge
 * its own event handlers. Unlike <Link>, this button never calls e.preventDefault(),
 * which means Radix's composeEventHandlers correctly fires its close/select logic.
 */
function LinkButtonFn<
  TRouter extends AnyRouter = RegisteredRouter,
  TFrom extends string = string,
  TTo extends string | undefined = undefined,
>(
  {
    to,
    params,
    search,
    hash,
    newTab = false,
    newSplitTab = false,
    onClick,
    className,
    type = 'button',
    children,
    ...props
  }: LinkButtonProps<TRouter, TFrom, TTo>,
  ref: React.ForwardedRef<HTMLButtonElement>,
) {
  const navigate = useNavigate();
  const router = useRouter();
  const { openTab, updateTab, setActiveTab } = useActions();

  const activeTab = useSelector((state) =>
    state.tabs.tabList.find((t) => t.id === state.tabs.activeTabId[state.tabs.activePane]),
  );
  const activePane = useSelector((state) => state.tabs.activePane);
  const primaryTabList = useSelector((state) =>
    state.tabs.tabList.filter((t) => state.tabs.paneTabIds.primary.includes(t.id)),
  );
  const secondaryTabList = useSelector((state) =>
    state.tabs.tabList.filter((t) => state.tabs.paneTabIds.secondary.includes(t.id)),
  );

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;

    const resolved = router.buildLocation({
      to,
      params,
      search,
      hash,
    } as Parameters<typeof router.buildLocation>[0]);
    const toStr = resolved.pathname;
    const targetSearch = resolved.search as Record<string, unknown>;
    const targetHash = resolved.hash ?? '';

    const isModifierHeld = event.metaKey || event.ctrlKey;
    const isShiftHeld = event.shiftKey;

    const activePaneTabList = activePane === 'secondary' ? secondaryTabList : primaryTabList;
    const oppositePaneTabList = activePane === 'secondary' ? primaryTabList : secondaryTabList;
    const targetTabList = isShiftHeld ? oppositePaneTabList : activePaneTabList;
    const allTabs = [...primaryTabList, ...secondaryTabList];

    const shouldOpenNewTab = isModifierHeld || newTab;
    const shouldSplitTab = isShiftHeld || newSplitTab;
    const isViewLink = toStr.startsWith('/view/');
    const isPreviewEligible =
      isViewLink && !isModifierHeld && !isShiftHeld && !newTab && !newSplitTab;

    const existingTab = targetTabList.find((t) =>
      matchTabLocation(t, toStr, targetSearch, targetHash),
    );
    const existingGroupTab = !existingTab ? findGroupTab(allTabs, toStr) : null;
    const existingTabSamePath =
      !existingTab && !existingGroupTab
        ? (allTabs.find((t) => t.pathname === toStr) ?? null)
        : null;

    if (existingGroupTab && !isModifierHeld && !shouldSplitTab) {
      setActiveTab(existingGroupTab.id);
      updateTab(existingGroupTab.id, {
        pathname: toStr,
        search: targetSearch,
        hash: targetHash,
      });
    } else if (existingTabSamePath && !isModifierHeld && !shouldSplitTab) {
      setActiveTab(existingTabSamePath.id);
      updateTab(existingTabSamePath.id, { search: targetSearch, hash: targetHash });
    } else if (existingTab && !isModifierHeld) {
      setActiveTab(existingTab.id);
    } else if (isPreviewEligible) {
      openTab({
        pathname: toStr,
        search: targetSearch,
        hash: targetHash,
        pane: activePane,
        preview: true,
      });
    } else if (!(shouldOpenNewTab || shouldSplitTab) && activeTab) {
      const isDocumentLink = toStr.startsWith('/edit/') || toStr.startsWith('/view/');
      const isLeavingDirtyEditTab =
        activeTab.pathname.startsWith('/edit/') &&
        activeTab.isDirty &&
        toStr !== activeTab.pathname;
      if (isLeavingDirtyEditTab) {
        window.dispatchEvent(
          new CustomEvent('save-request', { detail: { tabId: activeTab.id, isAutosave: true } }),
        );
      }
      updateTab(activeTab.id, {
        pathname: toStr,
        search: targetSearch,
        hash: targetHash,
        isDirty: isDocumentLink ? undefined : activeTab.isDirty,
      });
      navigate({ to: toStr, search: targetSearch, hash: targetHash });
    } else {
      const pane = shouldSplitTab ? 'opposite' : activePane;
      openTab({ pathname: toStr, search: targetSearch, hash: targetHash, pane });
    }
  };

  return (
    <button ref={ref} type={type} className={className} {...props} onClick={handleClick}>
      {children}
    </button>
  );
}

export const LinkButton = React.forwardRef(LinkButtonFn) as unknown as <
  TRouter extends AnyRouter = RegisteredRouter,
  TFrom extends string = string,
  TTo extends string | undefined = undefined,
>(
  props: LinkButtonProps<TRouter, TFrom, TTo> & { ref?: React.Ref<HTMLButtonElement> },
) => React.ReactElement;

(LinkButton as { displayName?: string }).displayName = 'LinkButton';
