/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { Tab } from '@repo/types';

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
