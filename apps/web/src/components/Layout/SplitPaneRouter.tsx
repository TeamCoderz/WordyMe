/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { Tab } from '@repo/types';
import { useEffect, useRef, useState } from 'react';
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
  useNavigate,
} from '@tanstack/react-router';
import { routeTree } from '@/routeTree.gen';
import { store, useSelector } from '@/store';
import { queryClient } from '@/App';
import { matchTabLocation } from './tabs/utils';
import { authClient } from '@repo/sdk/auth';

export interface SplitPaneRouterProps {
  tab: Tab;
  type: 'primary' | 'secondary' | null;
}

/** Build an href string from a tab's pathname, search, and hash. */
function buildHref(tab: Tab): string {
  return (
    tab.pathname +
    (tab.search ? `?${new URLSearchParams(tab.search as Record<string, string>).toString()}` : '') +
    (tab.hash ? `#${tab.hash}` : '')
  );
}

/**
 * Renders any route inside the split pane by mounting
 * a second TanStack Router instance backed by memory history.
 * The `isSplitPane` context flag tells the root layout to render
 * only <Outlet /> (no sidebar, header, or tab bars).
 *
 * Uses `key={tab.id}` to remount when the active tab changes,
 * so the inner component can safely use a `useState` lazy initializer
 * to create the router exactly once per mount.
 */
export function SplitPaneRouter({ tab, type }: SplitPaneRouterProps) {
  const { data: session, isPending, isRefetching } = authClient.useSession();
  const navigate = useNavigate();
  const activePane = useSelector((state) => state.tabs.activePane);
  // Track whether we are currently syncing tab→router to avoid
  // an infinite loop when the router fires onResolved in response.
  const isSyncingRef = useRef(false);

  // Created once per mount (component remounts when tab.id changes via key).
  const [splitRouter] = useState(() =>
    createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: [buildHref(tab)] }),
      context: {
        store,
        queryClient,
        session: { data: null, isLoading: true },
        isSplitPane: true as const,
        splitPaneType: type,
        tabId: tab.id,
      },
    }),
  );

  // Sync tab state → split router when the tab's location changes
  // (e.g. external navigation or tab store update).
  useEffect(() => {
    isSyncingRef.current = true;
    splitRouter.navigate({
      to: tab.pathname,
      search: tab.search ?? {},
      hash: tab.hash,
      replace: true,
    });

    // Reset after a tick so the resulting onResolved is ignored.
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  }, [tab.pathname, tab.search, tab.hash, splitRouter]);

  // Sync split router → tab store when the user navigates inside the pane
  // (e.g. clicks a link).
  useEffect(() => {
    return splitRouter.subscribe('onResolved', () => {
      if (isSyncingRef.current) return;
      if (type !== activePane) return;

      const { pathname, hash, search } = splitRouter.state.location;
      const locationMatches = matchTabLocation(tab, pathname, search, hash);
      if (locationMatches) return;
      navigate({
        to: pathname,
        search: search,
        hash: hash,
      });
    });
  }, [splitRouter, activePane, navigate]);

  return (
    <RouterProvider
      router={splitRouter}
      context={{
        store,
        queryClient,
        session: { data: session, isLoading: isPending || isRefetching },
        isSplitPane: true as const,
        splitPaneType: type,
        tabId: tab.id,
      }}
    />
  );
}
