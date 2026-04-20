/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  keepPreviousData,
  useMutation,
  useQueryClient,
  UseSuspenseQueryOptions,
} from '@tanstack/react-query';
import type { QueryClient, UseQueryOptions } from '@tanstack/react-query';
import {
  deleteDocument,
  updateDocument,
  getDocumentByHandle,
  createDocument,
  getUserDocuments,
  getLastViewedDocuments,
  createDocumentWithRevision,
  getDocumentById,
  searchDocuments,
} from '@repo/sdk/documents.ts';
import {
  addDocumentToFavorites,
  getFavorites,
  removeDocumentFromFavorites as deleteDocumentFromFavorites,
} from '@repo/sdk/favorites.ts';
import { toast } from 'sonner';
import { generatePositionKeyBetween, getSiblings, sortByPosition } from '@repo/lib/utils/position';
import { sanitizeName } from '@repo/lib/utils/filename';
import {
  filterValidHierarchy,
  useAllQueriesInvalidate,
  useRemoveWithDescendantsFromCache,
} from './utils';
import type {
  EditorDocument,
  ListDocumentRow,
  DocumentList,
  ListDocumentOrParentRef,
  SearchDocumentResult,
} from '@repo/types';
import type { SortOptions } from '@/types';
import { DOCUMENTS_QUERY_KEYS } from './query-keys';
import { computeChecksum } from '@repo/editor/utils/computeChecksum';
import { format } from 'date-fns';
import {
  copyDocument,
  exportDocument,
  importDocument,
  moveDocument,
} from '@repo/sdk/operations.ts';
import { notFound, useMatch, useNavigate } from '@tanstack/react-router';
// import { revisions } from "@repo/backend/sdk";
import { getInitialEditorState } from '@repo/editor/utils/getInitialEditorState';
import { useActions, useSelector } from '@/store';
import { getRevisionsByDocumentIdQueryOptions } from './revisions';
import { addDocumentToCache, isDocumentCached, removeDocumentFromCache } from './caches/documents';
import { createLocalDocument, deleteLocalDocument } from '@repo/editor/indexeddb';
import { importDocumentSchema } from '@repo/backend/operations.ts';

/** Prefer invalidating the space tree when `spaceId` is known; otherwise invalidate all document lists. */
function documentListInvalidateKey(spaceId: string | null | undefined) {
  return spaceId ? DOCUMENTS_QUERY_KEYS.LIST_BY_SPACE(spaceId) : DOCUMENTS_QUERY_KEYS.LIST_BASE;
}

const listDocuments = async ({ spaceId }: { spaceId: string }) => {
  return await getUserDocuments({ spaceId, documentType: 'note' });
};

export const searchDocumentsQueryOptions = (search: string, spaceId?: string, limit = 20) => {
  const trimmedSearch = search.trim();

  return {
    queryKey: DOCUMENTS_QUERY_KEYS.SEARCH_DOCUMENTS(trimmedSearch, spaceId),
    queryFn: async (): Promise<SearchDocumentResult[]> => {
      if (!trimmedSearch) {
        return [];
      }

      const { data, error } = await searchDocuments(trimmedSearch, limit, spaceId);
      if (error) {
        throw error;
      }
      return data ?? [];
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
    enabled: !!trimmedSearch,
  };
};

export function getAllDocumentsQueryOptions(spaceID: string): UseQueryOptions<DocumentList> {
  return {
    queryKey: DOCUMENTS_QUERY_KEYS.LIST_BY_SPACE(spaceID),
    queryFn: async () => {
      const { data, error } = await listDocuments({ spaceId: spaceID });
      if (error) {
        throw error;
      }
      return filterValidHierarchy(data || []);
    },
    staleTime: 0,
    enabled: !!spaceID,
  };
}

export const useRenameDocumentMutation = ({ document }: { document: ListDocumentRow }) => {
  const queryClient = useQueryClient();
  const invalidate = useAllQueriesInvalidate();
  const { updateTab } = useActions();
  const tabs = useSelector((state) => state.tabs.tabList);
  const editRouteMatch = useMatch({
    from: '/_authed/edit/$handle',
    shouldThrow: false,
  });
  const viewRouteMatch = useMatch({
    from: '/_authed/view/$handle',
    shouldThrow: false,
  });
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationKey: ['renameDocument', document.id],
    mutationFn: async ({ documentId, name }: { documentId: string; name: string }) => {
      const { data, error } = await updateDocument(documentId, { name });
      if (error) throw error;
      invalidate([
        DOCUMENTS_QUERY_KEYS.RECENT_VIEWS,
        DOCUMENTS_QUERY_KEYS.FAVORITES,
        DOCUMENTS_QUERY_KEYS.HOME.BASE,
        documentListInvalidateKey(document.spaceId),
      ]);
      return data;
    },
    onMutate() {
      return toast.loading('Renaming document...');
    },
    onSuccess: (_, __, toastId) => {
      toast.success('Document renamed successfully', {
        id: toastId,
      });
    },
    onError: (error, __, toastId) => {
      toast.error(error.message || 'Failed to rename document', {
        id: toastId,
      });
    },
  });
  const updateDocumentName = async (documentId: string, name: string) => {
    const oldName = document.name;

    // Update getAllDocuments cache
    queryClient.setQueryData(
      getAllDocumentsQueryOptions(document.spaceId!).queryKey,
      (old: DocumentList) => {
        return old?.map((document) => {
          if (document.id === documentId) {
            return { ...document, name };
          }
          return document;
        });
      },
    );
    // Update getDocumentByHandle cache for tab metadata reactivity
    queryClient.setQueryData(
      getDocumentByHandleQueryOptions(document.handle).queryKey,
      (old: EditorDocument | undefined) => (old ? { ...old, name } : old),
    );
    await mutation.mutateAsync(
      { documentId, name },
      {
        onSuccess: async (data) => {
          // Update the tab pathname if handle changed
          const documentTab = tabs.find(
            (tab) =>
              tab.pathname === `/edit/${document.handle}` ||
              tab.pathname === `/view/${document.handle}`,
          );
          if (documentTab && data && data.handle !== document.handle) {
            const newPathname = documentTab.pathname.startsWith('/edit/')
              ? `/edit/${data.handle}`
              : `/view/${data.handle}`;
            updateTab(documentTab.id, { pathname: newPathname });
          }

          if (viewRouteMatch || editRouteMatch) {
            if (
              document.handle === (viewRouteMatch?.params.handle ?? editRouteMatch?.params.handle)
            ) {
              if (data) {
                await queryClient.ensureQueryData(getDocumentByHandleQueryOptions(data?.handle));
              }
              navigate({
                to: viewRouteMatch ? '/view/$handle' : '/edit/$handle',
                params: {
                  handle: data?.handle ?? '',
                },
              });
            }
          }
        },
        onError: () => {
          queryClient.setQueryData(
            getAllDocumentsQueryOptions(document.spaceId!).queryKey,
            (old: DocumentList) => {
              return old?.map((doc) => {
                if (doc.id === documentId) {
                  return { ...doc, name: oldName };
                }
                return doc;
              });
            },
          );
          queryClient.setQueryData(
            getDocumentByHandleQueryOptions(document.handle).queryKey,
            (old: EditorDocument | undefined) => (old ? { ...old, name: oldName } : old),
          );
        },
      },
    );
  };
  return { updateDocumentName, ...mutation };
};
export const useUpdateDocumentIconMutation = ({ document }: { document: ListDocumentRow }) => {
  const queryClient = useQueryClient();
  const invalidate = useAllQueriesInvalidate();
  const mutation = useMutation({
    mutationKey: ['updateDocumentIcon'],
    mutationFn: async ({ documentId, icon }: { documentId: string; icon: string }) => {
      const { data, error } = await updateDocument(documentId, { icon });
      if (error) throw error;
      invalidate([
        DOCUMENTS_QUERY_KEYS.RECENT_VIEWS,
        DOCUMENTS_QUERY_KEYS.FAVORITES,
        DOCUMENTS_QUERY_KEYS.HOME.BASE,
        documentListInvalidateKey(document.spaceId),
      ]);
      return data;
    },
    onMutate() {
      return toast.loading('Updating document icon...');
    },
    onSuccess: (_, __, toastId) => {
      toast.success('Document icon updated successfully', {
        id: toastId,
      });
    },
    onError: (error, __, toastId) => {
      toast.error(error.message || 'Failed to update document icon', {
        id: toastId,
      });
    },
  });
  const updateDocumentIcon = async (documentId: string, icon: string) => {
    const oldIcon = document.icon;

    queryClient.setQueryData(
      getAllDocumentsQueryOptions(document.spaceId!).queryKey,
      (old: DocumentList) => {
        return old?.map((document) => {
          if (document.id === documentId) {
            return { ...document, icon };
          }
          return document;
        });
      },
    );
    // Update getDocumentByHandle cache for tab metadata reactivity
    queryClient.setQueryData(
      getDocumentByHandleQueryOptions(document.handle).queryKey,
      (old: EditorDocument | undefined) => (old ? { ...old, icon } : old),
    );
    mutation.mutateAsync(
      { documentId, icon },
      {
        onError: () => {
          queryClient.setQueryData(
            getAllDocumentsQueryOptions(document.spaceId!).queryKey,
            (old: DocumentList) => {
              return old?.map((document) => {
                if (document.id === documentId) {
                  return { ...document, icon: oldIcon };
                }
                return document;
              });
            },
          );
          queryClient.setQueryData(
            getDocumentByHandleQueryOptions(document.handle).queryKey,
            (old: EditorDocument | undefined) => (old ? { ...old, icon: oldIcon } : old),
          );
        },
      },
    );
  };
  return { updateDocumentIcon, ...mutation };
};

const listFavoriteDocuments = async (
  filters: Omit<Parameters<typeof getFavorites>[0], 'documentType'>,
) => {
  return await getFavorites({ documentType: 'note', ...filters });
};
export function getFavoriteDocumentsQueryOptions(searchParams: {
  search?: string;
  sort?: 'a-z' | 'z-a' | 'newest' | 'lastViewed';
  page?: number;
}): UseSuspenseQueryOptions<
  NonNullable<Awaited<ReturnType<typeof listFavoriteDocuments>>['data']>
> {
  return {
    queryKey: [
      ...DOCUMENTS_QUERY_KEYS.FAVORITES,
      {
        search: searchParams.search ?? '',
        sort: searchParams.sort ?? 'a-z',
        page: searchParams.page ?? 1,
      },
    ],
    queryFn: async () => {
      const { data, error } = await listFavoriteDocuments({
        limit: 10,
        order: searchParams.sort === 'a-z' || searchParams.sort === undefined ? 'asc' : 'desc',
        orderBy:
          searchParams.sort === 'a-z' ||
          searchParams.sort === 'z-a' ||
          searchParams.sort === undefined
            ? 'name'
            : searchParams.sort === 'lastViewed'
              ? 'lastViewedAt'
              : 'createdAt',
        page: searchParams.page ?? 1,
        type: 'note',
        name: searchParams.search ?? '',
      });
      if (error) throw error;
      return (
        data ?? {
          items: [],
          meta: { total: 0, last_page: 0, page: 1, limit: 10 },
        }
      );
    },
  };
}

/** Space-scoped document tree cache (`getAllDocumentsQueryOptions`) for optimistic favorite toggles. */
export type DocumentFavoriteCacheTarget = {
  documentId: string;
  /** When set, list invalidation is scoped to this space; otherwise all document lists are invalidated. */
  spaceId?: string;
};

export const useDocumentFavoritesMutation = () => {
  const invalidate = useAllQueriesInvalidate();
  const addMutation = useMutation({
    mutationKey: ['addDocumentToFavorites'],
    mutationFn: async ({ documentId, spaceId }: { documentId: string; spaceId?: string }) => {
      const { data, error } = await addDocumentToFavorites(documentId);
      if (error) throw error;
      invalidate([
        DOCUMENTS_QUERY_KEYS.RECENT_VIEWS,
        DOCUMENTS_QUERY_KEYS.FAVORITES,
        DOCUMENTS_QUERY_KEYS.HOME.BASE,
        documentListInvalidateKey(spaceId),
      ]);
      return data;
    },
    onMutate() {
      return toast.loading('Adding to favorites...');
    },
    onSuccess: (_, __, toastId) => {
      toast.success('Added to favorites', {
        id: toastId,
      });
    },
    onError: (error, __, toastId) => {
      toast.error(error.message || 'Failed to add to favorites', {
        id: toastId,
      });
    },
  });
  const queryClient = useQueryClient();
  const removeMutation = useMutation({
    mutationKey: ['removeDocumentFromFavorites'],
    mutationFn: async ({ documentId, spaceId }: { documentId: string; spaceId?: string }) => {
      const { error } = await deleteDocumentFromFavorites(documentId);
      if (error) throw error;

      invalidate([
        DOCUMENTS_QUERY_KEYS.RECENT_VIEWS,
        DOCUMENTS_QUERY_KEYS.FAVORITES,
        DOCUMENTS_QUERY_KEYS.HOME.BASE,
        documentListInvalidateKey(spaceId),
      ]);
    },
    onMutate() {
      return toast.loading('Removing from favorites...');
    },
    onSuccess: (_, __, toastId) => {
      toast.success('Removed from favorites', { id: toastId });
    },
    onError: (error, __, toastId) => {
      toast.error(error.message || 'Failed to remove from favorites', {
        id: toastId,
      });
    },
  });

  const addToDocumentFavorites = async ({ documentId, spaceId }: DocumentFavoriteCacheTarget) => {
    if (!spaceId) {
      await addMutation.mutateAsync({ documentId });
      return;
    }
    const listKey = getAllDocumentsQueryOptions(spaceId).queryKey;
    const oldFavorites = (queryClient.getQueryData(listKey) as DocumentList | undefined)?.find(
      (row) => row.id === documentId,
    )?.isFavorite;
    queryClient.setQueryData(listKey, (old: DocumentList) => {
      return old?.map((row) => {
        if (row.id === documentId) {
          return { ...row, isFavorite: true };
        }
        return row;
      });
    });
    await addMutation.mutateAsync(
      { documentId, spaceId },
      {
        onError: () => {
          queryClient.setQueryData(listKey, (old: DocumentList) => {
            return old?.map((row) => {
              if (row.id === documentId) {
                return { ...row, isFavorite: oldFavorites };
              }
              return row;
            });
          });
        },
      },
    );
  };

  const removeDocumentFromFavorites = async ({
    documentId,
    spaceId,
  }: DocumentFavoriteCacheTarget) => {
    if (!spaceId) {
      await removeMutation.mutateAsync({ documentId });
      return;
    }
    const listKey = getAllDocumentsQueryOptions(spaceId).queryKey;
    const oldFavorites = (queryClient.getQueryData(listKey) as DocumentList | undefined)?.find(
      (row) => row.id === documentId,
    )?.isFavorite;
    queryClient.setQueryData(listKey, (old: DocumentList) => {
      return old?.map((row) => {
        if (row.id === documentId) {
          return { ...row, isFavorite: false };
        }
        return row;
      });
    });
    await removeMutation.mutateAsync(
      { documentId, spaceId },
      {
        onError: () => {
          queryClient.setQueryData(listKey, (old: DocumentList) => {
            return old?.map((row) => {
              if (row.id === documentId) {
                return { ...row, isFavorite: oldFavorites };
              }
              return row;
            });
          });
        },
      },
    );
  };

  return {
    addToDocumentFavorites,
    removeDocumentFromFavorites,
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
};

export const useCreateDocumentMutation = ({
  document,
  from,
}: {
  document: ListDocumentRow;
  from: 'sidebar' | 'manage';
}) => {
  const queryClient = useQueryClient();
  const invalidate = useAllQueriesInvalidate();
  const mutation = useMutation({
    mutationKey: ['createDocument'],
    mutationFn: async ({
      parentId,
      spaceId,
      name,
      clientId,
    }: {
      parentId?: string | null;
      spaceId?: string | null;
      name?: string | null;
      clientId: string;
    }) => {
      const currentDocuments = queryClient.getQueryData(
        getAllDocumentsQueryOptions(document.spaceId!).queryKey,
      ) as DocumentList;

      if (!currentDocuments) {
        throw new Error('No documents data available');
      }

      // Get siblings (spaces with the same parentId)
      const siblings = getSiblings(currentDocuments, parentId);

      // Sort siblings by position
      const sortedSiblings = sortByPosition(siblings);
      // Calculate new position after the last sibling
      let newPosition: string;
      if (sortedSiblings.length === 0) {
        // No siblings, use initial position
        newPosition = 'a0';
      } else {
        // Get the last sibling's position and generate a position after it
        const lastSibling = sortedSiblings[sortedSiblings.length - 1];
        const lastPosition = lastSibling?.position || 'a0';

        // Generate a position after the last sibling
        newPosition = generatePositionKeyBetween(lastPosition, null);
      }
      const serializedEditorState = getInitialEditorState(name?.trim() || 'New Document');
      const checksum = computeChecksum(serializedEditorState);
      const content = JSON.stringify(serializedEditorState);
      const { data, error } = await createDocumentWithRevision({
        name: name?.trim() || 'New Document',
        icon: 'file',
        parentId: parentId ?? null,
        position: newPosition,
        spaceId: spaceId!,
        isContainer: false,
        clientId: clientId,
        documentType: 'note',
        revision: {
          content,
          checksum,
          text: name?.trim() || 'New Document',
          makeCurrentRevision: true,
        },
      });

      if (error) throw error;
      if (data) {
        createLocalDocument(data.id, data.name);
      }

      invalidate([
        DOCUMENTS_QUERY_KEYS.RECENT_VIEWS,
        DOCUMENTS_QUERY_KEYS.FAVORITES,
        DOCUMENTS_QUERY_KEYS.HOME.BASE,
        documentListInvalidateKey(document.spaceId),
      ]);

      return data;
    },
    onMutate() {
      // Get current spaces from cache to calculate position
      return { toastId: toast.loading('Creating document...') };
    },
    onSuccess: async (data, { clientId }, { toastId }) => {
      const { currentRevision, ...documentRow } = data;

      if (!isDocumentCached(clientId)) {
        queryClient.setQueryData(
          getAllDocumentsQueryOptions(data.spaceId!).queryKey,
          (old: DocumentList) => {
            if (old) {
              addDocumentToCache(clientId, from);
              return [...old, documentRow];
            }
            return old;
          },
        );
      }
      toast.success('Document created successfully', {
        id: toastId ?? undefined,
      });
    },
    onError: (error, { clientId }, context) => {
      queryClient.setQueryData(
        getAllDocumentsQueryOptions(document.spaceId!).queryKey,
        (old: DocumentList) => {
          return old?.filter((document) => {
            return document.id !== clientId;
          });
        },
      );
      removeDocumentFromCache(clientId);
      toast.error(error.message || 'Failed to create document', {
        id: context?.toastId ?? undefined,
      });
    },
  });

  return mutation;
};
export const useCreateContainerDocumentMutation = ({
  document,
  from,
}: {
  document: ListDocumentRow;
  from: 'sidebar' | 'manage';
}) => {
  const queryClient = useQueryClient();
  const invalidate = useAllQueriesInvalidate();

  const mutation = useMutation({
    mutationKey: ['createContainerDocument'],
    mutationFn: async ({
      parentId,
      spaceId,
      name,
      clientId,
    }: {
      parentId?: string | null;
      spaceId?: string | null;
      name?: string | null;
      clientId: string;
    }) => {
      const currentDocuments = queryClient.getQueryData(
        getAllDocumentsQueryOptions(document.spaceId!).queryKey,
      ) as DocumentList;

      if (!currentDocuments) {
        throw new Error('No documents data available');
      }

      // Get siblings (spaces with the same parentId)
      const siblings = getSiblings(currentDocuments, parentId);

      // Sort siblings by position
      const sortedSiblings = sortByPosition(siblings);
      // Calculate new position after the last sibling
      let newPosition: string;
      if (sortedSiblings.length === 0) {
        // No siblings, use initial position
        newPosition = 'a0';
      } else {
        // Get the last sibling's position and generate a position after it
        const lastSibling = sortedSiblings[sortedSiblings.length - 1];
        const lastPosition = lastSibling?.position || 'a0';

        // Generate a position after the last sibling
        newPosition = generatePositionKeyBetween(lastPosition, null);
      }
      const { data, error } = await createDocument({
        name: name?.trim() || 'New Folder',
        icon: 'folder',
        parentId: parentId ?? null,
        position: newPosition,
        spaceId: spaceId!,
        isContainer: true,
        clientId: clientId,
        documentType: 'note',
      });

      if (error) throw error;

      invalidate([
        DOCUMENTS_QUERY_KEYS.RECENT_VIEWS,
        DOCUMENTS_QUERY_KEYS.FAVORITES,
        DOCUMENTS_QUERY_KEYS.HOME.BASE,
        documentListInvalidateKey(document.spaceId),
      ]);
      return data;
    },
    onMutate() {
      // Get current spaces from cache to calculate position
      return toast.loading('Creating folder...');
    },
    onSuccess: async (data, { clientId }, toastId) => {
      if (!isDocumentCached(clientId)) {
        queryClient.setQueryData(
          getAllDocumentsQueryOptions(document.spaceId!).queryKey,
          (old: DocumentList) => {
            if (old) {
              addDocumentToCache(data?.clientId ?? '', from);
              return [...old, data];
            }
            return old;
          },
        );
      }
      toast.success('Folder created successfully', {
        id: toastId ?? undefined,
      });
    },
    onError: (error, { clientId }, toastId) => {
      queryClient.setQueryData(
        getAllDocumentsQueryOptions(document.spaceId!).queryKey,
        (old: DocumentList) => {
          return old?.filter((document) => {
            return document.id !== clientId;
          });
        },
      );
      removeDocumentFromCache(clientId);
      toast.error(error.message || 'Failed to create folder', {
        id: toastId ?? undefined,
      });
    },
  });

  return mutation;
};
export const useDeleteDocumentMutation = ({ document }: { document: ListDocumentRow }) => {
  const invalidate = useAllQueriesInvalidate();
  const { closeTab } = useActions();
  const tabs = useSelector((state) => state.tabs.tabList);
  const editRouteMatch = useMatch({
    from: '/_authed/edit/$handle',
    shouldThrow: false,
  });
  const viewRouteMatch = useMatch({
    from: '/_authed/view/$handle',
    shouldThrow: false,
  });
  const removeFromCache = useRemoveWithDescendantsFromCache();
  const navigate = useNavigate();
  const isFolder = document?.isContainer;
  const label = isFolder ? 'folder' : 'document';
  const mutation = useMutation({
    mutationKey: ['deleteDocument'],
    mutationFn: async ({ documentId }: { documentId: string }) => {
      // Create space with default values and calculated position
      const { error } = await deleteDocument(documentId);
      if (error) throw error;
      await deleteLocalDocument(documentId);
      invalidate([
        DOCUMENTS_QUERY_KEYS.RECENT_VIEWS,
        DOCUMENTS_QUERY_KEYS.FAVORITES,
        DOCUMENTS_QUERY_KEYS.HOME.BASE,
        documentListInvalidateKey(document.spaceId),
      ]);
      return;
    },
    onMutate() {
      // Get current spaces from cache to calculate position
      return toast.loading(`Deleting ${label}: ${document.name}`);
    },
    onSuccess: async (_, __, toastId) => {
      // Close the tab if the deleted document is open
      const documentTab = tabs.find(
        (tab) =>
          tab.pathname === `/edit/${document.handle}` ||
          tab.pathname === `/view/${document.handle}`,
      );
      if (documentTab) {
        closeTab(documentTab.id);
      }

      if (viewRouteMatch || editRouteMatch) {
        if (document.handle === (viewRouteMatch?.params.handle ?? editRouteMatch?.params.handle)) {
          navigate({
            to: '/docs/manage',
          });
        }
      }
      removeFromCache(getAllDocumentsQueryOptions(document.spaceId!).queryKey, document.id);
      toast.success(`${label} deleted successfully`, {
        id: toastId ?? undefined,
      });
    },
    onError: (error, __, toastId) => {
      toast.error(error.message || `Failed to delete ${label}`, {
        id: toastId ?? undefined,
      });
    },
  });

  return mutation;
};

// Home page query options

export const getHomeFavoriteDocumentsQueryOptions = (orderBy: SortOptions) => {
  return {
    queryKey: [...DOCUMENTS_QUERY_KEYS.HOME.FAVORITES, { orderBy: orderBy ?? 'a-z' }],
    queryFn: async () => {
      const { data, error } = await listFavoriteDocuments({
        limit: 4,
        orderBy: orderBy === 'a-z' ? 'name' : orderBy === 'newest' ? 'createdAt' : 'lastViewedAt',
        order: orderBy === 'a-z' ? 'asc' : 'desc',
        type: 'note',
      });
      if (error) throw error;
      return data?.items ?? [];
    },
  };
};

export const getHomeAllDocumentsQueryOptions = (orderBy: SortOptions) => {
  return {
    queryKey: [...DOCUMENTS_QUERY_KEYS.HOME.ALL_DOCUMENTS],
    queryFn: async () => {
      const { data, error } = await getUserDocuments({
        orderBy:
          orderBy === 'a-z' || orderBy === 'z-a'
            ? 'name'
            : orderBy === 'newest'
              ? 'createdAt'
              : 'lastViewedAt',
        order: orderBy === 'a-z' ? 'asc' : 'desc',
        documentType: 'note',
        isContainer: false,
        limit: 4,
      });
      if (error) throw error;
      return data ?? [];
    },
  };
};

export const getHomeRecentViewsDocumentsQueryOptions = (orderBy: SortOptions) => {
  return {
    queryKey: [...DOCUMENTS_QUERY_KEYS.HOME.RECENT_VIEWS, { orderBy: orderBy ?? 'a-z' }],
    queryFn: async () => {
      const { data, error } = await getLastViewedDocuments({
        days: 14,
        orderBy:
          orderBy === 'a-z' || orderBy === 'z-a'
            ? 'name'
            : orderBy === 'newest'
              ? 'createdAt'
              : 'lastViewedAt',
        order: orderBy === 'a-z' ? 'asc' : 'desc',
        documentType: 'note',
        limit: 5,
        page: 1,
      });
      if (error) throw error;
      return data?.items ?? [];
    },
  };
};

export const getRecentViewedDocumentsQueryOptions = (searchParams: {
  search?: string;
  sort?: 'a-z' | 'z-a' | 'newest' | 'lastViewed';
  page?: number;
  days?: number;
}) => {
  return {
    queryKey: [
      ...DOCUMENTS_QUERY_KEYS.RECENT_VIEWS,

      {
        search: searchParams.search ?? '',
        sort: searchParams.sort ?? 'lastViewed',
        page: searchParams.page ?? 1,
        days: searchParams.days ?? 14,
      },
    ],
    queryFn: async () => {
      const { data, error } = await getLastViewedDocuments({
        days: searchParams.days ?? 14,
        limit: 10,
        orderBy:
          searchParams.sort === 'a-z' ||
          searchParams.sort === 'z-a' ||
          searchParams.sort === undefined
            ? 'name'
            : searchParams.sort === 'lastViewed'
              ? 'lastViewedAt'
              : 'createdAt',
        order: searchParams.sort === 'a-z' || searchParams.sort === undefined ? 'asc' : 'desc',
        search: searchParams.search ?? '',
        documentType: 'note',
        page: searchParams.page ?? 1,
      });
      if (error) throw error;
      return (
        data ?? {
          items: [],
          meta: { total: 0, last_page: 0, page: 1, limit: 10 },
        }
      );
    },
  };
};

export function useDuplicateDocumentMutation({ document }: { document: ListDocumentRow }) {
  const queryClient = useQueryClient();
  const invalidate = useAllQueriesInvalidate();
  const mutation = useMutation({
    mutationKey: ['duplicateDocument', document.id],
    mutationFn: async () => {
      const currentDocuments = queryClient.getQueryData(
        getAllDocumentsQueryOptions(document.spaceId!).queryKey,
      ) as DocumentList;
      if (!currentDocuments) {
        throw new Error('No documents data available');
      }

      // Get siblings (spaces with the same parentId)
      const siblings = getSiblings(currentDocuments, document.parentId);

      // Sort siblings by position
      const sortedSiblings = sortByPosition(siblings);
      // Calculate new position after the last sibling
      let newPosition: string;
      if (sortedSiblings.length === 0) {
        // No siblings, use initial position
        newPosition = 'a0';
      } else {
        // Get the last sibling's position and generate a position after it
        const mainItemIndex = sortedSiblings.findIndex((sibling) => sibling.id === document.id);
        const nextPosition = sortedSiblings[mainItemIndex + 1]?.position ?? null;

        // Generate a position after the last sibling
        newPosition = generatePositionKeyBetween(document.position, nextPosition);
      }
      const { data, error } = await copyDocument(document.id, {
        parentId: document.parentId ?? null,
        spaceId: document.spaceId ?? null,
        name: document.name,
        position: newPosition,
      });
      if (error) throw error;
      invalidate([
        DOCUMENTS_QUERY_KEYS.RECENT_VIEWS,
        DOCUMENTS_QUERY_KEYS.FAVORITES,
        DOCUMENTS_QUERY_KEYS.HOME.BASE,
        documentListInvalidateKey(document.spaceId),
      ]);
      return data;
    },
    onMutate() {
      return toast.loading('Duplicating document...');
    },
    onSuccess: (_, __, toastId) => {
      toast.success('Document duplicated successfully', {
        id: toastId ?? undefined,
      });
    },
    onError: (error, __, toastId) => {
      toast.error(error.message || 'Failed to duplicate document', {
        id: toastId ?? undefined,
      });
    },
  });
  return mutation;
}

export const getDocumentByIdQueryOptions = (id: string, queryClient?: QueryClient) => {
  return {
    queryKey: DOCUMENTS_QUERY_KEYS.DETAIL_BY_ID(id),
    queryFn: async () => {
      const { data: document, error: documentError } = await getDocumentById(id, {
        updateLastViewed: true,
      });
      if (documentError) {
        toast.error('Document not found');
        throw notFound();
      }

      if (queryClient && document?.handle) {
        queryClient.setQueryData(
          getDocumentByHandleQueryOptions(document.handle).queryKey,
          document,
        );
      }

      return document;
    },
  };
};

export const getDocumentByHandleQueryOptions = (handle: string) => {
  return {
    queryKey: DOCUMENTS_QUERY_KEYS.DETAIL_BY_HANDLE(handle),
    queryFn: async () => {
      const { data: document, error: documentError } = await getDocumentByHandle(handle, {
        updateLastViewed: true,
      });
      if (documentError) {
        toast.error('Document not found');
        throw notFound();
      }

      return document;
    },
  };
};

export function useUpdateDocumentHeadMutation({ doc }: { doc: EditorDocument | null }) {
  const invalidate = useAllQueriesInvalidate();
  const mutation = useMutation({
    mutationKey: ['updateDocumentHead', doc?.id],
    mutationFn: async (document: { id: string; head: string }) => {
      const { data, error } = await updateDocument(document.id, {
        currentRevisionId: document.head,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate([
        getDocumentByHandleQueryOptions(doc?.handle ?? '').queryKey,
        getRevisionsByDocumentIdQueryOptions(doc?.id ?? '').queryKey,
      ]);
    },
  });
  return mutation;
}

export function useCopyDocumentMutation(newParentDocument: ListDocumentOrParentRef) {
  const queryClient = useQueryClient();
  const invalidate = useAllQueriesInvalidate();
  const clipboardDocument = useSelector((state) => state.wordy.documentsClipboard);
  const { clearDocumentsClipboard } = useActions();
  const mutation = useMutation({
    mutationKey: ['copyDocument', clipboardDocument?.document.id],
    mutationFn: async () => {
      if (!clipboardDocument) {
        throw new Error('No clipboard document found');
      }
      const parentId = 'id' in newParentDocument ? newParentDocument.id : null;
      if (clipboardDocument.document.id === parentId) {
        throw new Error('You cannot copy a document to itself');
      }
      const currentDocuments = queryClient.getQueryData(
        getAllDocumentsQueryOptions(newParentDocument.spaceId!).queryKey,
      ) as DocumentList;
      if (!currentDocuments) {
        throw new Error('No documents data available');
      }

      // Get siblings (spaces with the same parentId)
      const siblings = getSiblings(currentDocuments, parentId);

      // Sort siblings by position
      const sortedSiblings = sortByPosition(siblings);
      // Calculate new position after the last sibling
      let newPosition: string;

      if (sortedSiblings.length === 0) {
        // No siblings, use initial position
        newPosition = 'a0';
      } else {
        // Get the last sibling's position and generate a position after it
        const lastPosition = sortedSiblings.at(-1)?.position ?? null;

        // Generate a position after the last sibling
        newPosition = generatePositionKeyBetween(lastPosition, null);
      }
      const { data, error } = await copyDocument(clipboardDocument.document.id, {
        parentId: parentId,
        spaceId: newParentDocument.spaceId,
        position: newPosition,
        name: clipboardDocument.document.name,
      });
      if (error) throw error;
      invalidate([
        DOCUMENTS_QUERY_KEYS.RECENT_VIEWS,
        DOCUMENTS_QUERY_KEYS.FAVORITES,
        DOCUMENTS_QUERY_KEYS.HOME.BASE,
        documentListInvalidateKey(newParentDocument.spaceId),
      ]);
      return data;
    },
    onMutate() {
      return toast.loading('Copying document...');
    },
    onSuccess: (_, __, toastId) => {
      toast.success('Document copied successfully', {
        id: toastId ?? undefined,
      });
      clearDocumentsClipboard();
    },
    onError: (error, __, toastId) => {
      toast.error(error.message || 'Failed to copy document', {
        id: toastId ?? undefined,
      });
    },
  });
  return mutation;
}

export const useMoveDocumentMutation = (newParentDocument: ListDocumentOrParentRef) => {
  const queryClient = useQueryClient();
  const invalidate = useAllQueriesInvalidate();
  const clipboardDocument = useSelector((state) => state.wordy.documentsClipboard);
  const { clearDocumentsClipboard } = useActions();
  const mutation = useMutation({
    mutationKey: ['moveDocument'],
    mutationFn: async () => {
      if (!clipboardDocument) {
        throw new Error('No clipboard document found');
      }
      const parentId = 'id' in newParentDocument ? newParentDocument.id : null;
      if (clipboardDocument.document.id === parentId) {
        throw new Error('You cannot move a document to itself');
      }

      const currentDocuments = queryClient.getQueryData(
        getAllDocumentsQueryOptions(newParentDocument.spaceId!).queryKey,
      ) as DocumentList;
      if (!currentDocuments) {
        throw new Error('No documents data available');
      }

      // Get siblings (spaces with the same parentId)
      const siblings = getSiblings(currentDocuments, parentId);

      // Sort siblings by position
      const sortedSiblings = sortByPosition(siblings);
      // Calculate new position after the last sibling
      let newPosition: string;
      if (sortedSiblings.length === 0) {
        // No siblings, use initial position
        newPosition = 'a0';
      } else {
        // Get the last sibling's position and generate a position after it
        const lastPosition = sortedSiblings.at(-1)?.position ?? null;

        // Generate a position after the last sibling
        newPosition = generatePositionKeyBetween(lastPosition, null);
      }
      const { data, error } = await moveDocument(clipboardDocument.document.id, {
        parentId: parentId,
        spaceId: newParentDocument.spaceId,
        position: newPosition,
      });
      if (error) throw error;
      invalidate([
        DOCUMENTS_QUERY_KEYS.RECENT_VIEWS,
        DOCUMENTS_QUERY_KEYS.FAVORITES,
        DOCUMENTS_QUERY_KEYS.HOME.BASE,
        documentListInvalidateKey(newParentDocument.spaceId),
      ]);
      return data;
    },
    onMutate() {
      return toast.loading('Moving document...');
    },
    onSuccess: (_, __, toastId) => {
      toast.success('Document moved successfully', {
        id: toastId ?? undefined,
      });
      // if (data?.spaceId !== clipboardDocument?.document.spaceId) {
      //   const removedDocuments = [
      //     clipboardDocument?.document,
      //     ...(getDescendants(
      //       queryClient.getQueryData(
      //         getAllDocumentsQueryOptions(
      //           clipboardDocument?.document.spaceId ?? ""
      //         ).queryKey
      //       ) as DocumentList,
      //       clipboardDocument?.document.id ?? ""
      //     ) as DocumentList),
      //   ];
      //   const removedDocumentsIds = removedDocuments.map(
      //     (document) => document?.id ?? ""
      //   );
      //   queryClient.setQueryData(
      //     getAllDocumentsQueryOptions(clipboardDocument?.document.spaceId ?? "")
      //       .queryKey,
      //     (old: DocumentList) => {
      //       return old?.filter(
      //         (document) => !removedDocumentsIds.includes(document.id)
      //       );
      //     }
      //   );
      //   queryClient.setQueryData(
      //     getAllDocumentsQueryOptions(newParentDocument.spaceId!).queryKey,
      //     (old: DocumentList) => {
      //       return [
      //         ...old,
      //         ...removedDocuments.map((document, index) => {
      //           if (index === 0) {
      //             return {
      //               ...document,
      //               parentId: newParentDocument.id,
      //               position: newPositionRef.current,
      //               spaceId: newParentDocument.spaceId,
      //             };
      //           }
      //           return { ...document, spaceId: newParentDocument.spaceId };
      //         }),
      //       ];
      //     }
      //   );
      // } else {
      //   queryClient.setQueryData(
      //     getAllDocumentsQueryOptions(newParentDocument.spaceId!).queryKey,
      //     (old: DocumentList) => {
      //       return old?.map((document) => {
      //         if (document.id === clipboardDocument?.document.id) {
      //           return {
      //             ...document,
      //             parentId: newParentDocument.id,
      //             position: newPositionRef.current,
      //           };
      //         }
      //         return document;
      //       });
      //     }
      //   );
      // }
      clearDocumentsClipboard();
    },
    onError: (error, __, toastId) => {
      toast.error(error.message || 'Failed to move document', {
        id: toastId ?? undefined,
      });
    },
  });
  return mutation;
};

export function useExportDocumentMutation(itemId: string, documentName?: string) {
  return useMutation({
    mutationKey: ['export-tree', itemId],
    mutationFn: async () => {
      const { data, error } = await exportDocument(itemId);
      if (error) {
        throw error;
      }
      if (data) {
        const forDownload =
          data.revision?.content != null
            ? {
                ...data,
                revision: {
                  ...data.revision,
                  content: JSON.parse(data.revision.content),
                },
              }
            : data;
        const jsonString = JSON.stringify(forDownload, null, 2);

        // Create a blob from the JSON string
        const blob = new Blob([jsonString], { type: 'application/json' });

        // Create a download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Format date as dd-MMM-yyyy (e.g., 12-Nov-2025)
        const formattedDate = format(new Date(), 'dd-MMM-yyyy');

        // Sanitize document name for filename - replace invalid filename characters but keep Unicode letters
        const sanitizedName = documentName ? sanitizeName(documentName) : 'untitled';

        link.download = `wordy-document-export-${sanitizedName}-${formattedDate}.json`;

        // Trigger download
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      return data;
    },
    onMutate() {
      return toast.loading('Exporting document...');
    },
    onError(error, __, context) {
      toast.error(error.message || 'Failed to export document', { id: context });
    },
    onSuccess(_, __, context) {
      toast.success('Document exported successfully', { id: context });
    },
  });
}

export function useImportDocumentMutation(parentId?: string | null, spaceId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['import-document', parentId, spaceId],
    mutationFn: async ({ file, position }: { file: File; position?: string | null }) => {
      const fileText = await file.text();
      const document = JSON.parse(fileText);

      const parsedDocument = await importDocumentSchema.safeParseAsync({
        parentId,
        spaceId,
        position,
        type: 'note',
        document: document,
      });
      if (!parsedDocument.success) {
        throw new Error('Invalid document');
      }
      if (parsedDocument.data.document.type !== 'note') {
        throw new Error('Invalid document type');
      }

      const { data, error } = await importDocument(parsedDocument.data);
      if (error) {
        throw error;
      }
      queryClient.invalidateQueries({
        queryKey: documentListInvalidateKey(spaceId),
      });
      return data;
    },
    onMutate() {
      return toast.loading('Importing document...');
    },
    onError(error, __, context) {
      toast.error(error.message || 'Failed to import document', {
        id: context,
      });
    },
    onSuccess(_, __, context) {
      toast.success('Document imported successfully', { id: context });
    },
  });
}
