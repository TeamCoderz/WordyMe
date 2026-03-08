/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { TabMetadata } from '@repo/types';
import { getDocumentByHandleQueryOptions } from '@/queries/documents';
import type { UseQueryOptions } from '@tanstack/react-query';

export type TabMetadataQueryOption = UseQueryOptions<any, any, TabMetadata>;
/**
 * Static metadata lookup for fixed routes.
 * These tabs always display the same title & icon.
 */
const STATIC_TAB_METADATA: Record<string, TabMetadata> = {
  '/': { title: 'Home', icon: 'home' },
  '/docs/manage': { title: 'Manage Docs', icon: 'folder-open' },
  '/docs/favorites': { title: 'Favorite Docs', icon: 'star' },
  '/docs/recent-viewed': { title: 'Recent Docs', icon: 'clock' },
  '/docs': { title: 'Documents', icon: 'folder-open' },
  '/spaces': { title: 'Spaces', icon: 'briefcase' },
  '/spaces/manage': { title: 'Manage Spaces', icon: 'briefcase' },
  '/spaces/favorites': { title: 'Favorite Spaces', icon: 'star' },
};

/**
 * Extract a document handle from `/edit/{handle}` or `/view/{handle}`.
 */
function getDocumentHandle(pathname: string): string | null {
  const match = pathname.match(/^\/(edit|view)\/(.+)$/);
  return match ? decodeURIComponent(match[2]) : null;
}

/** Returned by `resolveTabMetadata`. */
export interface ResolvedTabMetadata {
  /** Serializable metadata stored on the Tab (fallback for dynamic tabs). */
  metadata: TabMetadata;
  /** If present, register this for `useTabMetadata` to keep title/icon live. */
  queryOption?: TabMetadataQueryOption;
}

/**
 * Resolve tab metadata for a given pathname.
 *
 * - Static routes  → returns `{ metadata }` directly.
 * - Dynamic routes → returns `{ metadata (fallback), queryOption }`.
 *
 * Used primarily by `TabSync` when opening tabs from URL changes.
 *
 * @param pathname - The route pathname
 * @param search - Optional search params (e.g. for /iframe?url=... to derive title from hostname)
 */
export function resolveTabMetadata(
  pathname: string,
  search?: Record<string, unknown>,
): ResolvedTabMetadata {
  // 1. Static routes
  const staticMeta = STATIC_TAB_METADATA[pathname];
  if (staticMeta) {
    return { metadata: staticMeta };
  }

  // 2. Settings routes
  if (pathname.startsWith('/settings')) {
    return { metadata: { title: 'Settings', icon: 'settings' } };
  }

  // Attachment routes
  if (pathname.startsWith('/attachment')) {
    const name = search?.name as string | undefined;
    return { metadata: { title: name ?? 'Attachment', icon: 'file' } };
  }

  // 3. Document routes (dynamic — title & icon come from a query)
  const handle = getDocumentHandle(pathname);
  if (handle) {
    const docQueryOpts = getDocumentByHandleQueryOptions(handle);
    return {
      metadata: { title: '', icon: null }, // fallback while loading
      queryOption: {
        ...docQueryOpts,
        select: (doc: { name?: string; icon?: string | null }) => ({
          title: doc?.name ?? '',
          icon: doc?.icon ?? null,
        }),
      } as TabMetadataQueryOption,
    };
  }

  // Fallback
  return { metadata: { title: '', icon: null } };
}
