/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query';
import type { Tab, TabMetadata } from '@repo/types';
import { useEffect } from 'react';
import { TABS_QUERY_KEYS } from '@/queries/query-keys';
import { useSelector } from '@/store';
import { resolveTabMetadata } from './resolveTabMetadata';

/**
 * Hook to get resolved metadata for a tab.
 *
 * If a dynamic query option was registered for this tab (via
 * `registerTabMetadataQuery`), the query runs reactively and its result
 * overrides the stored metadata. Otherwise, the stored metadata on the tab
 * is returned as-is.
 *
 * If the metadata query fails (e.g. entity was deleted), the tab is
 * automatically closed.
 *
 * @example
 * // Inside the <Tab /> component:
 * const { title, icon } = useTabMetadata(tab);
 */
export function useTabMetadata(tab: Tab): TabMetadata {
  const resolved = resolveTabMetadata(tab.pathname, tab.search);
  const { closeTab } = useSelector((state) => state.tabsActions);

  const { data, isError } = useQuery({
    ...resolved.queryOption,
    queryKey: resolved.queryOption?.queryKey ?? TABS_QUERY_KEYS.METADATA_NOOP(tab.id),
    queryFn: resolved.queryOption?.queryFn ?? skipToken,
    placeholderData: keepPreviousData,
    retry: 1,
  });

  // Auto-close the tab when the backing entity no longer exists / query errors
  useEffect(() => {
    if (isError && resolved.queryOption) {
      closeTab(tab.id);
    }
  }, [isError, resolved.queryOption, tab.id]);
  return resolved.queryOption
    ? ((data as TabMetadata | undefined) ?? resolved.metadata)
    : resolved.metadata;
}
