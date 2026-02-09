import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getDocumentByHandleQueryOptions } from '@/queries/documents';
import type { TabMetadata } from '@repo/types';

/**
 * Static metadata map for fixed routes
 */
const STATIC_TAB_METADATA: Record<string, TabMetadata> = {
  '/': { title: 'Home', icon: 'home' },
  '/docs/manage': { title: 'Manage Docs', icon: 'folder-open' },
  '/docs/favorites': { title: 'Favorite Docs', icon: 'star' },
  '/docs/recent-viewed': { title: 'Recent Docs', icon: 'clock' },
  '/spaces/manage': { title: 'Manage Spaces', icon: 'briefcase' },
  '/spaces/favorites': { title: 'Favorite Spaces', icon: 'star' },
};

/**
 * Get static metadata for settings routes
 */
function getSettingsMetadata(_pathname: string): TabMetadata {
  return { title: 'Settings', icon: 'settings' };
}

/**
 * Extract document handle from /edit/{handle} or /view/{handle} pathname
 */
function getDocumentHandle(pathname: string): string | null {
  const match = pathname.match(/^\/(edit|view)\/(.+)$/);
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Hook to get computed metadata for a tab based on its pathname
 */
export function useTabMetadata(pathname: string): TabMetadata {
  const documentHandle = getDocumentHandle(pathname);

  const { data: document } = useQuery({
    ...getDocumentByHandleQueryOptions(documentHandle ?? ''),
    placeholderData: keepPreviousData,
    enabled: !!documentHandle,
  });

  // Check static routes first
  if (STATIC_TAB_METADATA[pathname]) {
    return STATIC_TAB_METADATA[pathname];
  }

  // Check settings routes
  if (pathname.startsWith('/settings')) {
    return getSettingsMetadata(pathname);
  }

  // Check document routes
  if (documentHandle) {
    return {
      title: document?.name ?? '',
      icon: document?.icon ?? null,
    };
  }

  // Default fallback
  return {
    title: '',
    icon: null,
  };
}
