import {
  createDocument,
  deleteDocument,
  updateDocument, // listSpaces,
  // updateSpace,
  // addSpaceToFavorites,
  // removeSpaceFromFavorites,
  // createSpace,
  // listFavoriteSpaces,
  // deleteSpace,
} from '@repo/sdk/documents.ts';
import { useMutation, useQueryClient, UseSuspenseQueryOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { generatePositionKeyBetween, getSiblings, sortByPosition } from '@repo/lib/utils/position';
import { sanitizeName } from '@repo/lib/utils/filename';
import {
  filterValidHierarchy,
  getDescendants,
  useAllQueriesInvalidate,
  useRemoveWithDescendantsFromCache,
} from './utils';
import { SortOptions } from '../types/sort';
import { SPACES_QUERY_KEYS } from './query-keys';
import { useActions, useSelector } from '@/store';
import {
  copyDocument,
  exportDocument,
  importDocument,
  moveDocument,
} from '@repo/sdk/operations.ts';
import { addSpaceToCache, isSpaceCached, removeSpaceFromCache } from './caches/spaces';
import { getUserDocuments } from '@repo/sdk/documents.ts';
import {
  addDocumentToFavorites,
  getFavorites,
  removeDocumentFromFavorites,
} from '@repo/sdk/favorites.ts';
import { importDocumentSchema } from '@repo/backend/operations.ts';
const listSpaces = async () => {
  return getUserDocuments({ documentType: 'space' });
};
export type ListSpaceResultItem = NonNullable<
  Awaited<ReturnType<typeof listSpaces>>['data']
>[number] & {
  from?: 'sidebar' | 'manage';
};
export type ListSpaceResult = ListSpaceResultItem[];

export const getAllSpacesQueryOptions: UseSuspenseQueryOptions<ListSpaceResult> = {
  queryKey: ['spaces'],
  queryFn: async () => {
    const { data, error } = await listSpaces();
    if (error) throw error;
    const filteredData = filterValidHierarchy(data ?? []);
    return filteredData;
  },
};
async function listFavoriteSpaces(
  filters: Omit<Parameters<typeof getFavorites>[0], 'documentType'>,
) {
  return getFavorites({ documentType: 'space', ...filters });
}
export function getFavoriteSpacesQueryOptions(searchParams: {
  search?: string;
  sort?: 'a-z' | 'z-a' | 'newest' | 'lastViewed';
  page?: number;
}): UseSuspenseQueryOptions<NonNullable<Awaited<ReturnType<typeof listFavoriteSpaces>>['data']>> {
  return {
    queryKey: [
      ...SPACES_QUERY_KEYS.FAVORITES,
      {
        search: searchParams.search ?? '',
        sort: searchParams.sort ?? 'a-z',
        page: searchParams.page ?? 1,
      },
    ],
    queryFn: async () => {
      const { data, error } = await listFavoriteSpaces({
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
        name: searchParams.search ?? '',
      });
      if (error) {
        throw error;
      }
      return (
        data ?? {
          items: [],
          meta: { total: 0, last_page: 0, page: 1, limit: 10 },
        }
      );
    },
  };
}

export const useRenameSpaceMutation = () => {
  const queryClient = useQueryClient();
  const invalidate = useAllQueriesInvalidate();
  const mutation = useMutation({
    mutationKey: ['renameSpace'],
    mutationFn: async ({ spaceId, name }: { spaceId: string; name: string }) => {
      const { data, error } = await updateDocument(spaceId, { name });
      if (error) throw error;
      invalidate([SPACES_QUERY_KEYS.FAVORITES, SPACES_QUERY_KEYS.HOME.BASE]);
      return data;
    },
    onMutate() {
      return toast.loading('Renaming space...');
    },
    onSuccess: (_, __, toastId) => {
      toast.success('Space renamed successfully', {
        id: toastId,
      });
    },
    onError: (error, __, toastId) => {
      toast.error(error.message || 'Failed to rename space', {
        id: toastId,
      });
    },
  });
  const updateSpaceName = async (spaceId: string, name: string) => {
    const oldName = (
      queryClient.getQueryData(getAllSpacesQueryOptions.queryKey) as ListSpaceResult
    )?.find((space) => space.id === spaceId)?.name;

    queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
      return old?.map((space) => {
        if (space.id === spaceId) {
          return { ...space, name };
        }
        return space;
      });
    });
    await mutation.mutateAsync(
      { spaceId, name },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
            return old?.map((space) => {
              if (space.id === spaceId) {
                return data;
              }
              return space;
            });
          });
        },
        onError: () => {
          queryClient.setQueryData(
            getAllSpacesQueryOptions.queryKey,
            (old: Awaited<ReturnType<typeof listSpaces>>['data']) => {
              return old?.map((space) => {
                return { ...space, name: oldName };
              });
            },
          );
        },
      },
    );
  };
  return { updateSpaceName, ...mutation };
};

export const useUpdateSpaceIconMutation = () => {
  const queryClient = useQueryClient();
  const invalidate = useAllQueriesInvalidate();
  const mutation = useMutation({
    mutationKey: ['updateSpaceIcon'],
    mutationFn: async ({ spaceId, icon }: { spaceId: string; icon: string }) => {
      const { data, error } = await updateDocument(spaceId, { icon });
      if (error) throw error;
      invalidate([SPACES_QUERY_KEYS.FAVORITES, SPACES_QUERY_KEYS.HOME.BASE]);
      return data;
    },
    onMutate() {
      return toast.loading('Updating space icon...');
    },
    onSuccess: (_, __, toastId) => {
      toast.success('Space icon updated successfully', {
        id: toastId,
      });
    },
    onError: (error, __, toastId) => {
      toast.error(error.message || 'Failed to update space icon', {
        id: toastId,
      });
    },
  });
  const updateSpaceIcon = async (spaceId: string, icon: string) => {
    const oldIcon = (
      queryClient.getQueryData(getAllSpacesQueryOptions.queryKey) as ListSpaceResult
    )?.find((space) => space.id === spaceId)?.icon;

    queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
      return old?.map((space) => {
        if (space.id === spaceId) {
          return { ...space, icon };
        }
        return space;
      });
    });
    mutation.mutateAsync(
      { spaceId, icon },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
            return old?.map((space) => {
              if (space.id === spaceId) {
                return data;
              }
              return space;
            });
          });
        },
        onError: () => {
          queryClient.setQueryData(
            getAllSpacesQueryOptions.queryKey,
            (old: Awaited<ReturnType<typeof listSpaces>>['data']) => {
              return old?.map((space) => {
                return { ...space, icon: oldIcon };
              });
            },
          );
        },
      },
    );
  };
  return { updateSpaceIcon, ...mutation };
};

export const useSpaceFavoritesMutation = () => {
  const invalidate = useAllQueriesInvalidate();
  const addMutation = useMutation({
    mutationKey: ['addSpaceToFavorites'],
    mutationFn: async (spaceId: string) => {
      const { data, error } = await addDocumentToFavorites(spaceId);
      if (error) throw error;
      invalidate([SPACES_QUERY_KEYS.FAVORITES, SPACES_QUERY_KEYS.HOME.BASE]);
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
    mutationKey: ['removeSpaceFromFavorites'],
    mutationFn: async (spaceId: string) => {
      const { error } = await removeDocumentFromFavorites(spaceId);
      if (error) throw error;
      invalidate([SPACES_QUERY_KEYS.FAVORITES, SPACES_QUERY_KEYS.HOME.BASE]);
      return;
    },
    onMutate() {
      return toast.loading('Removing from favorites...');
    },
    onSuccess: (_, __, toastId) => {
      toast.success('Removed from favorites', {
        id: toastId,
      });
    },
    onError: (error, __, toastId) => {
      toast.error(error.message || 'Failed to remove from favorites', {
        id: toastId,
      });
    },
  });

  const addToFavorites = async (spaceId: string) => {
    const oldFavorites = (
      queryClient.getQueryData(getAllSpacesQueryOptions.queryKey) as ListSpaceResult
    )?.find((space) => space.id === spaceId)?.isFavorite;
    queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
      return old?.map((space) => {
        if (space.id === spaceId) {
          return { ...space, isFavorite: true };
        }
        return space;
      });
    });
    await addMutation.mutateAsync(spaceId, {
      onSuccess: () => {
        queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
          return old?.map((space) => {
            if (space.id === spaceId) {
              return {
                ...space,
                isFavorite: true,
              };
            }
            return space;
          });
        });
      },
      onError: () => {
        queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
          return old?.map((space) => {
            if (space.id === spaceId) {
              return { ...space, isFavorite: oldFavorites };
            }
            return space;
          });
        });
      },
    });
  };

  const removeFromFavorites = async (spaceId: string) => {
    const oldFavorites = (
      queryClient.getQueryData(getAllSpacesQueryOptions.queryKey) as ListSpaceResult
    )?.find((space) => space.id === spaceId)?.isFavorite;
    queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
      return old?.map((space) => {
        if (space.id === spaceId) {
          return { ...space, isFavorite: false };
        }
        return space;
      });
    });
    await removeMutation.mutateAsync(spaceId, {
      onError: () => {
        queryClient.setQueryData(
          getAllSpacesQueryOptions.queryKey,
          (old: Awaited<ReturnType<typeof listSpaces>>['data']) => {
            return old?.map((space) => {
              if (space.id === spaceId) {
                return { ...space, favorites: oldFavorites };
              }
              return space;
            });
          },
        );
      },
    });
  };

  return {
    addToFavorites,
    removeFromFavorites,
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
};

export const useCreateSpaceMutation = ({ from: _ }: { from: 'sidebar' | 'manage' }) => {
  const queryClient = useQueryClient();
  const invalidate = useAllQueriesInvalidate();
  const mutation = useMutation({
    mutationKey: ['createSpace'],
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
      // Get current spaces from cache to calculate position
      const currentSpaces = queryClient.getQueryData(getAllSpacesQueryOptions.queryKey) as Awaited<
        ReturnType<typeof listSpaces>
      >['data'];

      if (!currentSpaces) {
        throw new Error('No spaces data available');
      }

      // Get siblings (spaces with the same parentId)
      const siblings = getSiblings(currentSpaces, parentId);

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
      // Create space with default values and calculated position
      const { data, error } = await createDocument({
        name: name?.trim() || 'New Space',
        icon: 'briefcase',
        parentId: parentId ?? null,
        position: newPosition,
        spaceId: spaceId ?? null,
        isContainer: false,
        clientId: clientId,
        documentType: 'space',
      });

      if (error) throw error;
      invalidate([SPACES_QUERY_KEYS.FAVORITES, SPACES_QUERY_KEYS.HOME.BASE]);
      return data;
    },
    onMutate() {
      return toast.loading('Creating space...');
    },
    onSuccess: (data, _, toastId) => {
      if (data) {
        if (!isSpaceCached(data?.clientId)) {
          queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
            if (old) {
              addSpaceToCache(data?.clientId);
              return [...old, data];
            }
            return old;
          });
        }
      }
      toast.success('Space created successfully', {
        id: toastId ?? undefined,
      });
    },
    onError: (error, { clientId }, toastId) => {
      queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
        return old?.filter((space) => {
          return space.id !== clientId;
        });
      });
      removeSpaceFromCache(clientId);
      toast.error(error.message || 'Failed to create space', {
        id: toastId ?? undefined,
      });
    },
  });

  return mutation;
};
export const useCreateContainerSpaceMutation = ({ from: _ }: { from: 'sidebar' | 'manage' }) => {
  const queryClient = useQueryClient();
  const invalidate = useAllQueriesInvalidate();
  const mutation = useMutation({
    mutationKey: ['createContainerSpace'],
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
      // Get current spaces from cache to calculate position
      const currentSpaces = queryClient.getQueryData(getAllSpacesQueryOptions.queryKey) as Awaited<
        ReturnType<typeof listSpaces>
      >['data'];

      if (!currentSpaces) {
        throw new Error('No spaces data available');
      }

      // Get siblings (spaces with the same parentId)
      const siblings = getSiblings(currentSpaces, parentId);

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
        name: name?.trim() || 'New Container',
        icon: 'folder-closed',
        parentId: parentId ?? null,
        position: newPosition,
        spaceId: spaceId ?? null,
        isContainer: true,
        clientId: clientId,
        documentType: 'space',
      });

      if (error) throw error;
      invalidate([SPACES_QUERY_KEYS.FAVORITES, SPACES_QUERY_KEYS.HOME.BASE]);
      return data;
    },
    onMutate() {
      return toast.loading('Creating container space...');
    },
    onSuccess: (data, _, toastId) => {
      if (data) {
        if (!isSpaceCached(data?.clientId)) {
          queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
            if (old) {
              addSpaceToCache(data?.clientId);
              return [...old, data];
            }
            return old;
          });
        }
      }

      toast.success('Container space created successfully', {
        id: toastId ?? undefined,
      });
    },
    onError: (error, { clientId }, toastId) => {
      queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
        return old?.filter((space) => {
          return space.id !== clientId;
        });
      });
      removeSpaceFromCache(clientId);
      toast.error(error.message || 'Failed to create container space', {
        id: toastId ?? undefined,
      });
    },
  });

  return mutation;
};
export const useUpdateSpacePositionMutation = () => {
  const queryClient = useQueryClient();
  const invalidate = useAllQueriesInvalidate();
  const mutation = useMutation({
    mutationKey: ['updateSpacePosition'],
    mutationFn: async ({
      parentId,
      position,
      space,
    }: {
      parentId: string | null;
      position: string;
      space: ListSpaceResult[number];
    }) => {
      const { data, error } = await updateDocument(space.id, {
        parentId: parentId,
        position,
      });
      if (error) throw error;
      invalidate([SPACES_QUERY_KEYS.FAVORITES, SPACES_QUERY_KEYS.HOME.BASE]);
      return data;
    },
    onMutate() {
      return toast.loading('Updating space position...');
    },
    onSuccess: (_, __, toastId) => {
      toast.success('Space position updated successfully', {
        id: toastId,
      });
    },
    onError: (error, __, toastId) => {
      toast.error(error.message || 'Failed to update space position', {
        id: toastId,
      });
    },
  });
  const updateSpacePosition = async ({
    parentId,
    position,
    space,
  }: {
    parentId: string | null;
    position: string;
    space: ListSpaceResult[number];
  }) => {
    queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
      return old?.map((space) => {
        if (space.id === space.id) {
          return { ...space, parentId, position };
        }
        return space;
      });
    });
    mutation.mutate(
      { parentId, position, space },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
            return old?.map((s) => {
              if (s.id === space.id) {
                return data;
              }
              return s;
            });
          });
        },
        onError: () => {
          queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
            return old?.map((s) => {
              if (s.id === space.id) {
                return space;
              }
              return s;
            });
          });
        },
      },
    );
  };
  return { updateSpacePosition, ...mutation };
};
export const useDeleteSpaceMutation = ({ space }: { space: ListSpaceResult[number] }) => {
  const queryClient = useQueryClient();
  const invalidate = useAllQueriesInvalidate();
  const descendantSpaces = getDescendants(
    queryClient.getQueryData(getAllSpacesQueryOptions.queryKey) as ListSpaceResult,
    space.id,
  );
  const removeFromCache = useRemoveWithDescendantsFromCache();
  const isFolder = space.isContainer;
  const label = isFolder ? 'folder' : 'space';
  const mutation = useMutation({
    mutationKey: ['deleteSpace'],
    mutationFn: async ({ spaceId }: { spaceId: string }) => {
      removeFromCache(getAllSpacesQueryOptions.queryKey, space.id);

      // Create space with default values and calculated position
      const { error } = await deleteDocument(spaceId);

      if (error) throw error;
      invalidate([SPACES_QUERY_KEYS.FAVORITES, SPACES_QUERY_KEYS.HOME.BASE]);
      return;
    },
    onMutate() {
      // Get current spaces from cache to calculate position
      return toast.loading(`Deleting ${label}: ${space.name}`);
    },
    onSuccess: (_, __, toastId) => {
      toast.success(`${label}: ${space.name} deleted successfully`, {
        id: toastId ?? undefined,
      });
    },
    onError: (error, __, toastId) => {
      queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
        return [...old, space, ...descendantSpaces];
      });
      toast.error(error.message || `Failed to delete ${label}: ${space.name}`, {
        id: toastId ?? undefined,
      });
    },
  });

  return mutation;
};
export const getHomeFavoriteSpacesQueryOptions = (orderBy: SortOptions) => {
  return {
    queryKey: [...SPACES_QUERY_KEYS.HOME.FAVORITES, { orderBy: orderBy ?? 'a-z' }],
    queryFn: async () => {
      const { data, error } = await listFavoriteSpaces({
        limit: 4,
        orderBy:
          orderBy === 'a-z' || orderBy === 'z-a'
            ? 'name'
            : orderBy === 'newest'
              ? 'createdAt'
              : 'lastViewedAt',
        order: orderBy === 'a-z' ? 'asc' : 'desc',
      });
      if (error) throw error;
      return data?.items ?? [];
    },
  };
};
export function useCopySpaceMutation(newParentSpace: ListSpaceResult[number] | null) {
  const queryClient = useQueryClient();
  const invalidate = useAllQueriesInvalidate();
  const clipboardSpace = useSelector((state) => state.spacesClipboard);
  const { clearSpacesClipboard } = useActions();
  const mutation = useMutation({
    mutationKey: ['copyDocument', clipboardSpace?.space.id],
    mutationFn: async () => {
      if (!clipboardSpace) {
        throw new Error('No clipboard space found');
      }
      const parentId = newParentSpace?.id ?? null;
      if (clipboardSpace.space.id === parentId) {
        throw new Error('You cannot copy a space to itself');
      }
      const currentSpaces = queryClient.getQueryData(
        getAllSpacesQueryOptions.queryKey,
      ) as ListSpaceResult;
      if (!currentSpaces) {
        throw new Error('No spaces data available');
      }

      // Get siblings (spaces with the same parentId)
      const siblings = getSiblings(currentSpaces, parentId);

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
      const { data, error } = await copyDocument(clipboardSpace.space.id, {
        parentId,
        spaceId: null,
        position: newPosition,
        name: clipboardSpace.space.name,
      });
      if (error) throw error;
      invalidate([SPACES_QUERY_KEYS.FAVORITES, SPACES_QUERY_KEYS.HOME.BASE]);
      return data;
    },
    onMutate() {
      return toast.loading('Copying space...');
    },
    onSuccess: (_, __, toastId) => {
      toast.success('Space copied successfully', {
        id: toastId ?? undefined,
      });
      clearSpacesClipboard();
    },
    onError: (error, __, toastId) => {
      toast.error(error.message || 'Failed to copy space', {
        id: toastId ?? undefined,
      });
    },
  });
  return mutation;
}
export const useMoveSpaceMutation = (newParentSpace: ListSpaceResult[number] | null) => {
  const queryClient = useQueryClient();
  const invalidate = useAllQueriesInvalidate();
  const clipboardSpace = useSelector((state) => state.spacesClipboard);
  const { clearSpacesClipboard } = useActions();
  const mutation = useMutation({
    mutationKey: ['moveSpace', clipboardSpace?.space.id],
    mutationFn: async () => {
      if (!clipboardSpace) {
        throw new Error('No clipboard space found');
      }
      const parentId = newParentSpace?.id ?? null;
      if (clipboardSpace.space.id === parentId) {
        throw new Error('You cannot move a space to itself');
      }
      const currentSpaces = queryClient.getQueryData(
        getAllSpacesQueryOptions.queryKey,
      ) as ListSpaceResult;
      if (!currentSpaces) {
        throw new Error('No spaces data available');
      }

      // Get siblings (spaces with the same parentId)
      const siblings = getSiblings(currentSpaces, parentId);

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
      const { data, error } = await moveDocument(clipboardSpace.space.id, {
        parentId: parentId,
        spaceId: null,
        position: newPosition,
      });
      if (error) throw error || new Error('Failed to move space');
      invalidate([SPACES_QUERY_KEYS.FAVORITES, SPACES_QUERY_KEYS.HOME.BASE]);
      return data;
    },
    onMutate() {
      return toast.loading('Moving space...');
    },
    onSuccess: (_, __, toastId) => {
      toast.success('Document moved successfully', {
        id: toastId ?? undefined,
      });
      clearSpacesClipboard();
    },
    onError: (error, __, toastId) => {
      toast.error(error.message || 'Failed to move space', {
        id: toastId ?? undefined,
      });
    },
  });
  return mutation;
};

export function useDuplicateSpaceMutation({ space }: { space: ListSpaceResult[number] }) {
  const queryClient = useQueryClient();
  const invalidate = useAllQueriesInvalidate();
  const mutation = useMutation({
    mutationKey: ['duplicateSpace', space.id],
    mutationFn: async () => {
      const currentSpaces = queryClient.getQueryData(
        getAllSpacesQueryOptions.queryKey,
      ) as ListSpaceResult;
      if (!currentSpaces) {
        throw new Error('No spaces data available');
      }

      const siblings = getSiblings(currentSpaces, space.parentId ?? null);
      const sortedSiblings = sortByPosition(siblings);

      let newPosition: string;
      if (sortedSiblings.length === 0) {
        newPosition = 'a0';
      } else {
        const mainItemIndex = sortedSiblings.findIndex((s) => s.id === space.id);
        const nextPosition = sortedSiblings[mainItemIndex + 1]?.position ?? null;
        newPosition = generatePositionKeyBetween(space.position, nextPosition);
      }

      const { data, error } = await copyDocument(space.id, {
        parentId: space.parentId ?? null,
        spaceId: null,
        name: space.name,
        position: newPosition,
      });
      if (error) throw error;
      invalidate([SPACES_QUERY_KEYS.FAVORITES, SPACES_QUERY_KEYS.HOME.BASE]);
      return data;
    },
    onMutate() {
      return toast.loading('Duplicating space...');
    },
    onSuccess: (_, __, toastId) => {
      toast.success('Space duplicated successfully', {
        id: toastId ?? undefined,
      });
    },
    onError: (error, __, toastId) => {
      toast.error(error.message || 'Failed to duplicate space', {
        id: toastId ?? undefined,
      });
    },
  });
  return mutation;
}

export function useExportSpaceMutation(itemId: string, spaceName?: string) {
  return useMutation({
    mutationKey: ['export-tree', itemId],
    mutationFn: async () => {
      const { data, error } = await exportDocument(itemId);
      if (error) {
        throw error;
      }
      if (data) {
        // Stringify the data
        const jsonString = JSON.stringify(data, null, 2);

        // Create a blob from the JSON string
        const blob = new Blob([jsonString], { type: 'application/json' });

        // Create a download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Format date as dd-MMM-yyyy (e.g., 12-Nov-2025)
        const formattedDate = format(new Date(), 'dd-MMM-yyyy');

        // Sanitize space name for filename - replace invalid filename characters but keep Unicode letters
        const sanitizedName = spaceName ? sanitizeName(spaceName) : 'untitled';

        link.download = `wordy-space-export-${sanitizedName}-${formattedDate}.json`;

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
      return toast.loading('Exporting space...');
    },
    onError(_, __, context) {
      toast.error('Failed to export space', { id: context });
    },
    onSuccess(_, __, context) {
      toast.success('Space exported successfully', { id: context });
    },
  });
}

export function useImportSpaceMutation(parentId?: string | null, spaceId?: string | null) {
  const invalidate = useAllQueriesInvalidate();

  return useMutation({
    mutationKey: ['import-space', parentId, spaceId],
    mutationFn: async ({ file, position }: { file: File; position?: string | null }) => {
      const fileText = await file.text();
      const document = JSON.parse(fileText);
      const parsedDocument = await importDocumentSchema.safeParseAsync({
        parentId: parentId ?? null,
        spaceId: spaceId ?? null,
        position: position ?? null,
        type: 'space',
        document: document,
      });
      if (!parsedDocument.success) {
        throw new Error('Invalid document');
      }
      if (parsedDocument.data.type !== 'space') {
        throw new Error('Invalid document type');
      }
      const { data, error } = await importDocument(parsedDocument.data);
      if (error) {
        throw error;
      }
      invalidate([SPACES_QUERY_KEYS.FAVORITES, SPACES_QUERY_KEYS.HOME.BASE]);
      return data;
    },
    onMutate() {
      return toast.loading('Importing space...');
    },
    onError(error, __, context) {
      toast.error(error.message || 'Failed to import space', { id: context });
    },
    onSuccess(_, __, context) {
      toast.success('Space imported successfully', { id: context });
    },
  });
}
