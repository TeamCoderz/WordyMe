import { getAllSpacesQueryOptions, ListSpaceResult } from '@/queries/spaces';
import { useActions, useSelector } from '@/store';
import { calculateSpacePath } from '@/utils/calculateSpacePath';
import { Space } from '@repo/types';
import { Button } from '@repo/ui/components/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createFileRoute,
  ErrorRouteComponent,
  Link,
  Outlet,
  redirect,
  useNavigate,
} from '@tanstack/react-router';
import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef } from 'react';

import AppSidebarProvider from '@/providers/AppSidebarProvider';
import { AppHeader } from '@/components/Layout/app-header';
import { AppSidebar } from '@/components/Layout/app-sidebar';
import { SidebarInset } from '@repo/ui/components/sidebar';
import { getSession, useSession } from '@repo/sdk/auth';
import {
  connectSocket,
  disconnectSocket,
  off,
  on,
  subscribeToSpace,
  unsubscribeFromSpace,
} from '@repo/sdk/realtime/client.ts';
import { PlainDocument } from '@repo/backend/documents.js';
import { addSpaceToCache, isSpaceCached, removeSpaceFromCache } from '@/queries/caches/spaces';
import { useAllQueriesInvalidate } from '@/queries/utils';
import { DOCUMENTS_QUERY_KEYS, SPACES_QUERY_KEYS } from '@/queries/query-keys';
import { getAllDocumentsQueryOptions, ListDocumentResult } from '@/queries/documents';
import {
  addDocumentToCache,
  isDocumentCached,
  removeDocumentFromCache,
} from '@/queries/caches/documents';

const AuthedRouteErrorComponent: ErrorRouteComponent = ({ error, reset }) => {
  useEffect(() => {
    console.error('Error in Authed Route:', error);
  }, [error]);
  return (
    <div className="w-full flex-1 flex items-center justify-center p-4 flex-col gap-4">
      <h1 className="text-2xl font-bold mb-4 text-destructive text-center">
        An unexpected error occurred
      </h1>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={reset}>
          Reset
        </Button>
        <Button variant="outline" asChild>
          <Link to="/">Go to Home Page</Link>
        </Button>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ context: { session, store } }) => {
    let sessionUser: NonNullable<NonNullable<typeof session.data>['user']> | null =
      session.data?.user ?? null;
    if (session.isLoading) {
      const { data, error } = await getSession();
      if (error || data == null) {
        throw redirect({ to: '/login' });
      }
      sessionUser = data.user;
    } else if (session.data == null) {
      throw redirect({ to: '/login' });
    }
    if (!sessionUser) {
      store.setState({
        user: null,
      });
      return;
    }

    const cover_image = sessionUser.coverMeta;
    const avatar_image = sessionUser.imageMeta;
    const cover_image_url = sessionUser.cover;
    const avatar_image_url = sessionUser.image;
    const user = store.getState().user;

    store.setState({
      user: {
        ...sessionUser,
        cover_image: cover_image
          ? {
              url: cover_image_url ?? null,
              x: cover_image?.x ?? null,
              y: cover_image?.y ?? null,
              width: cover_image?.width ?? null,
              height: cover_image?.height ?? null,
              zoom: cover_image?.zoom ?? null,
              type: 'cover',
              calculatedImage: user?.cover_image?.calculatedImage ?? null,
              isLoading: user?.cover_image?.isLoading ?? true,
            }
          : undefined,
        avatar_image: avatar_image
          ? {
              url: avatar_image_url ?? null,
              x: avatar_image?.x ?? null,
              y: avatar_image?.y ?? null,
              width: avatar_image?.width ?? null,
              height: avatar_image?.height ?? null,
              zoom: avatar_image?.zoom ?? null,
              type: 'avatar',
              calculatedImage: user?.avatar_image?.calculatedImage ?? null,
              isLoading: user?.avatar_image?.isLoading ?? true,
              provider: 'supabase',
            }
          : undefined,
        editor_settings: {
          id: '',
          createdAt: new Date(),
          userId: sessionUser.id,
          keepPreviousRevision: false,
          autosave: false,
        },
        isGuest: false,
      },
    });
  },
  component: RouteComponent,
  errorComponent: AuthedRouteErrorComponent,
  notFoundComponent: NotFoundComponent,
});
function NotFoundComponent() {
  return (
    <div className="w-full flex-1 flex items-center justify-center p-4 flex-col gap-4">
      <h1 className="text-2xl font-bold mb-4">404 - Page Not Found</h1>
      <Button variant="outline" asChild>
        <Link to="/">Go to Home Page</Link>
      </Button>
    </div>
  );
}
function RouteComponent() {
  return (
    <>
      <AppSidebarProvider>
        <AppHeader />
        <div className="relative flex flex-1">
          <AppSidebar />
          <SidebarInset className="w-0 flex-1">
            <Outlet />
          </SidebarInset>
        </div>
      </AppSidebarProvider>
      <ActiveSpaceLoader />
      <RealTimeChangeListener />
      <UserImagesLoader />
      <UserSync />
    </>
  );
}
function UserSync() {
  const { setUser: setUserAction } = useActions();
  const { data: userSession } = useSession();
  const user = useSelector((state) => state.user);
  const navigate = useNavigate();
  useLayoutEffect(() => {
    if (!userSession?.user) {
      navigate({ to: '/login' });
      return;
    }
  }, [userSession, navigate]);
  const updateUser = useEffectEvent(
    (session: typeof userSession, setUser: typeof setUserAction) => {
      if (!session?.user) {
        return;
      }

      const cover_image = session.user.coverMeta;
      const avatar_image = session.user.imageMeta;
      const cover_image_url = session.user.cover;
      const avatar_image_url = session.user.image;
      setUser({
        ...session.user,
        cover_image: cover_image
          ? {
              url: cover_image_url ?? null,
              x: cover_image?.x ?? null,
              y: cover_image?.y ?? null,
              width: cover_image?.width ?? null,
              height: cover_image?.height ?? null,
              zoom: cover_image?.zoom ?? null,
              type: 'cover',
              calculatedImage: user?.cover_image?.calculatedImage ?? null,
              isLoading: user?.cover_image?.isLoading ?? true,
            }
          : undefined,
        avatar_image: avatar_image
          ? {
              url: avatar_image_url ?? null,
              x: avatar_image?.x ?? null,
              y: avatar_image?.y ?? null,
              width: avatar_image?.width ?? null,
              height: avatar_image?.height ?? null,
              zoom: avatar_image?.zoom ?? null,
              type: 'avatar',
              calculatedImage: user?.avatar_image?.calculatedImage ?? null,
              isLoading: user?.avatar_image?.isLoading ?? true,
              provider: 'supabase',
            }
          : undefined,
        editor_settings: {
          id: '',
          createdAt: new Date(),
          userId: session.user.id,
          keepPreviousRevision: false,
          autosave: false,
        },
        isGuest: false,
      });
    },
  );
  useEffect(() => {
    updateUser(userSession, setUserAction);
  }, [setUserAction, userSession]);
  return null;
}

function ActiveSpaceLoader() {
  const { data: spaces, isLoading } = useQuery(getAllSpacesQueryOptions);
  const { setActiveSpace } = useActions();
  const activeSpace = useSelector((state) => state.activeSpace);

  // Convert spaces array to Space[] for calculateSpacePath
  const spacesAsSpaceArray: Space[] = useMemo(() => {
    if (!spaces) return [];
    return spaces.map(
      (item): Space => ({
        id: item.id,
        name: item.name,
        description: null,
        createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
        updatedAt:
          item.updatedAt instanceof Date ? item.updatedAt.toISOString() : (item.updatedAt ?? null),
        icon: item.icon ?? '',
        parentId: item.parentId ?? null,
        handle: item.handle ?? null,
      }),
    );
  }, [spaces]);

  // Helper to convert ListSpaceResultItem to Space format
  const convertToSpace = (item: NonNullable<typeof spaces>[number]): Space => ({
    id: item.id,
    name: item.name,
    description: null,
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
    updatedAt:
      item.updatedAt instanceof Date ? item.updatedAt.toISOString() : (item.updatedAt ?? null),
    icon: item.icon ?? '',
    parentId: item.parentId ?? null,
    handle: item.handle ?? null,
  });

  useEffect(() => {
    if (!isLoading && spaces) {
      const freshActiveSpace = spaces?.find((space) => space.id === activeSpace?.id);
      if (freshActiveSpace && Boolean(freshActiveSpace.isContainer) == false) {
        const path = calculateSpacePath(freshActiveSpace.id, spacesAsSpaceArray);
        setActiveSpace({
          ...convertToSpace(freshActiveSpace),
          path,
        });
      } else {
        const space = spaces.find((s) => Boolean(s.isContainer) == false);
        if (!space) return;
        const path = calculateSpacePath(space.id, spacesAsSpaceArray);
        setActiveSpace({
          ...convertToSpace(space),
          path,
        });
      }
    }
  }, [spaces, isLoading, spacesAsSpaceArray]);
  useEffect(() => {
    if (spaces && !isLoading) {
      if (activeSpace) {
        const activeSpaceFullData = spaces?.find((space) => space.id === activeSpace.id);
        if (activeSpaceFullData && activeSpaceFullData.isContainer) {
          const space = spaces.find((s) => Boolean(s.isContainer) == false);
          if (!space) return;
          const path = calculateSpacePath(space.id, spacesAsSpaceArray);
          setActiveSpace({
            ...convertToSpace(space),
            path,
          });
        }
      }
    }
  }, [activeSpace, spaces, isLoading, spacesAsSpaceArray]);
  return null;
}
function RealTimeChangeListener() {
  const activeSpaceId = useSelector((state) => state.activeSpace?.id);
  const queryClient = useQueryClient();
  const invalidate = useAllQueriesInvalidate();
  useEffect(() => {
    connectSocket();
    return () => {
      disconnectSocket();
    };
  }, []);
  useEffect(() => {
    if (activeSpaceId) {
      subscribeToSpace(activeSpaceId);
      return () => {
        unsubscribeFromSpace(activeSpaceId);
      };
    }
    return;
  }, [activeSpaceId]);
  // handle spaces real-time changes
  useEffect(() => {
    // handle space created
    const handleSpaceCreated = (data: PlainDocument) => {
      queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
        if (old) {
          if (!isSpaceCached(data.clientId)) {
            addSpaceToCache(data.clientId);
            return [...old, data];
          }
        }
        return old;
      });
      invalidate([SPACES_QUERY_KEYS.FAVORITES, SPACES_QUERY_KEYS.HOME.BASE]);
    };
    on('space:created', handleSpaceCreated);
    // handle space updated
    const handleSpaceUpdated = (data: PlainDocument) => {
      queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
        if (old) {
          return old.map((space) => {
            if (space.id === data.id) {
              return data;
            }
            return space;
          });
        }
        return old;
      });
      invalidate([SPACES_QUERY_KEYS.FAVORITES, SPACES_QUERY_KEYS.HOME.BASE]);
    };
    on('space:updated', handleSpaceUpdated);
    // handle space deleted
    const handleSpaceDeleted = (data: PlainDocument) => {
      queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
        if (old) {
          removeSpaceFromCache(data.clientId);
          return old.filter((space) => space.id !== data.id);
        }
        return old;
      });
      invalidate([SPACES_QUERY_KEYS.FAVORITES, SPACES_QUERY_KEYS.HOME.BASE]);
    };
    on('space:deleted', handleSpaceDeleted);
    // handle space favorited
    const handleSpaceFavorited = (data: { id: string; userId: string; documentId: string }) => {
      queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
        if (old) {
          return old.map((space) => {
            if (space.id === data.documentId) {
              return { ...space, isFavorite: true };
            }
            return space;
          });
        }
        return old;
      });
      invalidate([SPACES_QUERY_KEYS.FAVORITES, SPACES_QUERY_KEYS.HOME.BASE]);
    };
    on('space:favorited', handleSpaceFavorited);
    // handle space unfavorited
    const handleSpaceUnfavorited = (data: { id: string; userId: string; documentId: string }) => {
      queryClient.setQueryData(getAllSpacesQueryOptions.queryKey, (old: ListSpaceResult) => {
        if (old) {
          return old.map((space) => {
            if (space.id === data.documentId) {
              return { ...space, isFavorite: false };
            }
            return space;
          });
        }
        return old;
      });
      invalidate([SPACES_QUERY_KEYS.FAVORITES, SPACES_QUERY_KEYS.HOME.BASE]);
    };
    on('space:unfavorited', handleSpaceUnfavorited);
    return () => {
      off('space:created', handleSpaceCreated);
      off('space:updated', handleSpaceUpdated);
      off('space:deleted', handleSpaceDeleted);
      off('space:favorited', handleSpaceFavorited);
      off('space:unfavorited', handleSpaceUnfavorited);
    };
  }, [queryClient, invalidate]);
  // handle documents real-time changes
  useEffect(() => {
    //handle document created
    const handleDocumentCreated = (data: PlainDocument) => {
      if (data.spaceId) {
        queryClient.setQueryData(
          getAllDocumentsQueryOptions(data.spaceId).queryKey,
          (old: ListDocumentResult) => {
            if (old) {
              if (!isDocumentCached(data.clientId)) {
                addDocumentToCache(data.clientId, 'real-time');
                return [...old, data];
              }
            }
            return old;
          },
        );
      }
      invalidate([
        DOCUMENTS_QUERY_KEYS.HOME.BASE,
        DOCUMENTS_QUERY_KEYS.FAVORITES,
        DOCUMENTS_QUERY_KEYS.RECENT_VIEWS,
      ]);
    };
    on('document:created', handleDocumentCreated);
    //handle document updated
    const handleDocumentUpdated = (data: PlainDocument) => {
      if (data.spaceId) {
        queryClient.setQueryData(
          getAllDocumentsQueryOptions(data.spaceId).queryKey,
          (old: ListDocumentResult) => {
            if (old) {
              return old.map((document) => {
                if (document.id === data.id) {
                  return data;
                }
                return document;
              });
            }
            return old;
          },
        );
      }
      invalidate([
        DOCUMENTS_QUERY_KEYS.HOME.BASE,
        DOCUMENTS_QUERY_KEYS.FAVORITES,
        DOCUMENTS_QUERY_KEYS.RECENT_VIEWS,
      ]);
    };
    on('document:updated', handleDocumentUpdated);
    //handle document deleted
    const handleDocumentDeleted = (data: PlainDocument) => {
      if (data.spaceId) {
        queryClient.setQueryData(
          getAllDocumentsQueryOptions(data.spaceId).queryKey,
          (old: ListDocumentResult) => {
            if (old) {
              removeDocumentFromCache(data.clientId);
              return old.filter((document) => document.id !== data.id);
            }
            return old;
          },
        );
      }
      invalidate([
        DOCUMENTS_QUERY_KEYS.HOME.BASE,
        DOCUMENTS_QUERY_KEYS.FAVORITES,
        DOCUMENTS_QUERY_KEYS.RECENT_VIEWS,
      ]);
    };
    on('document:deleted', handleDocumentDeleted);
    //handle document favorited
    // on('document:favorited', (data) => {});
    return () => {
      off('document:created', handleDocumentCreated);
      off('document:updated', handleDocumentUpdated);
      off('document:deleted', handleDocumentDeleted);
    };
  }, [queryClient, invalidate]);
  return null;
}

function UserImagesLoader() {
  const user = useSelector((state) => state.user);
  const { setAvatarImage, setCoverImage } = useActions();
  const processingRef = useRef<Set<string>>(new Set());

  const createCroppedImage = useCallback(
    async (
      src: string,
      cropData: { x: number; y: number; width: number; height: number },
    ): Promise<string | null> => {
      if (!src || typeof src !== 'string' || src.trim() === '') {
        console.warn('Invalid image source URL:', src);
        return null;
      }

      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        let imageBlob: Blob;
        let imageUrl: string;

        // Handle different URL types
        if (src.startsWith('blob:') || src.startsWith('data:')) {
          // For blob/data URLs, use directly
          imageUrl = src;
        } else if (src.startsWith('http://') || src.startsWith('https://')) {
          // For absolute URLs, use fetch with credentials
          try {
            const response = await fetch(src, {
              credentials: 'include',
            });
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.statusText}`);
            }
            imageBlob = await response.blob();
            imageUrl = URL.createObjectURL(imageBlob);
          } catch (error) {
            console.error('Error fetching external image:', { src, error });
            return null;
          }
        } else {
          // For relative paths, use fetch with storage endpoint
          // Normalize the path - remove leading slash if present
          const normalizedPath = src.startsWith('/') ? src.slice(1) : src;
          const storageUrl = `${backendUrl}/${normalizedPath}`;
          try {
            const response = await fetch(storageUrl, {
              credentials: 'include',
            });
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.statusText}`);
            }
            imageBlob = await response.blob();
            imageUrl = URL.createObjectURL(imageBlob);
          } catch (error) {
            console.error('Error fetching image from storage:', {
              src,
              normalizedPath,
              storageUrl,
              error,
            });
            return null;
          }
        }

        // Load the image from blob URL (no CORS issues)
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          const timeout = setTimeout(() => {
            reject(new Error('Image load timeout'));
          }, 30000); // 30 second timeout

          img.onload = () => {
            clearTimeout(timeout);
            resolve(img);
          };
          img.onerror = (error) => {
            clearTimeout(timeout);
            reject(error);
          };

          img.src = imageUrl;
        });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error('Failed to get canvas context');
          // Clean up blob URL if we created one
          if (imageUrl.startsWith('blob:') && imageUrl !== src) {
            URL.revokeObjectURL(imageUrl);
          }
          return null;
        }

        canvas.width = cropData.width;
        canvas.height = cropData.height;

        ctx.drawImage(
          image,
          cropData.x,
          cropData.y,
          cropData.width,
          cropData.height,
          0,
          0,
          cropData.width,
          cropData.height,
        );

        // Convert canvas to data URL
        const dataUrl = canvas.toDataURL('image/png', 0.95);

        // Clean up blob URL if we created one
        if (imageUrl.startsWith('blob:') && imageUrl !== src) {
          URL.revokeObjectURL(imageUrl);
        }

        return dataUrl;
      } catch (error) {
        console.error('Error creating cropped image:', {
          src,
          cropData,
          error,
        });
        return null;
      }
    },
    [],
  );

  // Process avatar image
  useEffect(() => {
    if (!user?.avatar_image?.url) return;

    // If the avatar comes from the auth provider, use the original URL as the calculated image
    if (user?.avatar_image?.provider === 'auth_provider') {
      setAvatarImage({
        ...user.avatar_image,
        calculatedImage: user.avatar_image.url,
        isLoading: false,
      });
      return;
    }

    const avatarKey = `avatar-${user.avatar_image.url}-${user.avatar_image.x}-${user.avatar_image.y}-${user.avatar_image.width}-${user.avatar_image.height}`;

    if (
      user.avatar_image.x !== null &&
      user.avatar_image.y !== null &&
      user.avatar_image.width !== null &&
      user.avatar_image.height !== null &&
      !processingRef.current.has(avatarKey)
    ) {
      processingRef.current.add(avatarKey);

      const processAvatar = async () => {
        const croppedUrl = await createCroppedImage(user.avatar_image!.url!, {
          x: user.avatar_image!.x!,
          y: user.avatar_image!.y!,
          width: user.avatar_image!.width!,
          height: user.avatar_image!.height!,
        });

        if (user?.avatar_image) {
          setAvatarImage({
            ...user.avatar_image,
            calculatedImage: croppedUrl,
            isLoading: false,
          });
        }
      };

      processAvatar();
    }
  }, [
    user?.avatar_image?.url,
    user?.avatar_image?.provider,
    user?.avatar_image?.x,
    user?.avatar_image?.y,
    user?.avatar_image?.width,
    user?.avatar_image?.height,
    user?.avatar_image?.calculatedImage,
    createCroppedImage,
    setAvatarImage,
  ]);

  // Process cover image
  useEffect(() => {
    if (!user?.cover_image?.url) return;

    const coverKey = `cover-${user.cover_image.url}-${user.cover_image.x}-${user.cover_image.y}-${user.cover_image.width}-${user.cover_image.height}`;

    if (
      user.cover_image.x !== null &&
      user.cover_image.y !== null &&
      user.cover_image.width !== null &&
      user.cover_image.height !== null &&
      !processingRef.current.has(coverKey)
    ) {
      processingRef.current.add(coverKey);

      const processCover = async () => {
        const croppedUrl = await createCroppedImage(user.cover_image!.url!, {
          x: user.cover_image!.x!,
          y: user.cover_image!.y!,
          width: user.cover_image!.width!,
          height: user.cover_image!.height!,
        });

        const currentUser = user;
        if (currentUser?.cover_image) {
          setCoverImage({
            ...currentUser.cover_image,
            calculatedImage: croppedUrl,
            isLoading: false,
          });
        }
      };

      processCover();
    }
  }, [
    user?.cover_image?.url,
    user?.cover_image?.x,
    user?.cover_image?.y,
    user?.cover_image?.width,
    user?.cover_image?.height,
    user?.cover_image?.calculatedImage,
    createCroppedImage,
    setCoverImage,
  ]);

  return null;
}
