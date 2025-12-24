import {
  addDocumentToCache,
  isDocumentCached,
  removeDocumentFromCache,
} from '@/queries/caches/documents';
import { addSpaceToCache, isSpaceCached, removeSpaceFromCache } from '@/queries/caches/spaces';
import { getAllDocumentsQueryOptions, ListDocumentResult } from '@/queries/documents';
import { DOCUMENTS_QUERY_KEYS, SPACES_QUERY_KEYS } from '@/queries/query-keys';
import { getAllSpacesQueryOptions, ListSpaceResult } from '@/queries/spaces';
import { useAllQueriesInvalidate, useRemoveWithDescendantsFromCache } from '@/queries/utils';
import { useActions, useSelector } from '@/store';
import { calculateSpacePath } from '@/utils/calculateSpacePath';
import { supabase } from '@repo/backend';
import { getDocumentById } from '@repo/backend/sdk/documents.js';
import { getValidatedUser } from '@repo/backend/sdk/session.js';
import { getSpaceById } from '@repo/backend/sdk/spaces.js';
import { getUserImageSignedUrl } from '@repo/backend/sdk/storage/user-images.js';
import { getVersion } from '@repo/backend/sdk/version.js';
import { Space } from '@repo/types';
import { Button } from '@repo/ui/components/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, ErrorRouteComponent, Link, Outlet } from '@tanstack/react-router';
import { RotateCw } from '@repo/ui/components/icons';
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import z from 'zod';
import AppSidebarProvider from '@/providers/AppSidebarProvider';
import { AppHeader } from '@/components/Layout/app-header';
import { AppSidebar } from '@/components/Layout/app-sidebar';
import { SidebarInset } from '@repo/ui/components/sidebar';

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
  beforeLoad: ({ context: { store } }) => {
    const { user } = store.getState();
    if (!user) {
      // const redirect = () => {
      //   const pathname = window.location.pathname;
      //   const search = pathname !== '/' ? `?redirect_to=${pathname}` : '';
      //   window.location.href = '/sign-in' + search;
      // };
      // Promise.all([
      //   cookieStore.delete('sb-access-token'),
      //   cookieStore.delete('sb-access-token.0'),
      //   cookieStore.delete('sb-access-token.1'),
      //   cookieStore.delete('sb-access-token-code-verifier'),
      // ]).then(() => {
      //   throw redirect();
      // });
    }
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
      <VersionChangeListener />
    </>
  );
}
function UserSync() {
  const { setUser } = useActions();
  const queryClient = useQueryClient();
  const cookieChangeHandler = useCallback(async () => {
    const cookies = await cookieStore.getAll();
    const hasAccessToken = cookies.some((cookie) => cookie.name?.startsWith('sb-access-token'));
    if (!hasAccessToken) {
      window.location.href = location.origin + '/home';
    }
  }, []);

  useEffect(() => {
    cookieStore.addEventListener('change', cookieChangeHandler);
    return () => {
      cookieStore.removeEventListener('change', cookieChangeHandler);
    };
  }, [cookieChangeHandler]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'USER_UPDATED') {
        const { data, error } = await getValidatedUser(true);
        if (error) return;
        const response = await data;
        if (response === null || response.error || response.data === null) return;
        const { data: userSession } = await supabase.auth.getSession();
        await supabase.realtime.setAuth(userSession.session?.access_token);
        const avatar = response.data.profile.user_images.find((image) => image.type === 'avatar');
        const isAvatarURL = z.url().safeParse(avatar?.path ?? '');
        const cover_image = response.data.profile.user_images.find(
          (image) => image.type === 'cover',
        );
        const cover_image_url =
          cover_image?.path != null
            ? (await getUserImageSignedUrl(cover_image?.path ?? '')).data?.signedUrl
            : null;
        const avatar_image_url =
          avatar?.path != null && !isAvatarURL.success
            ? (await getUserImageSignedUrl(avatar?.path ?? '')).data?.signedUrl
            : (avatar?.path ?? null);
        setUser(
          response.data.profile
            ? {
                ...response.data.profile,
                editor_settings: response.data.profile.editor_settings,
                email: response.data.user.email,
                last_signed_in: response.data.user.last_sign_in_at,
                avatar_image: avatar
                  ? {
                      url: avatar_image_url ?? null,
                      x: avatar?.x ?? null,
                      y: avatar?.y ?? null,
                      width: avatar?.width ?? null,
                      height: avatar?.height ?? null,
                      zoom: avatar?.zoom ?? null,
                      type: avatar?.type ?? null,
                      calculatedImage: null,
                      isLoading: true,
                      provider: isAvatarURL.success ? 'auth_provider' : 'supabase',
                    }
                  : undefined,
                cover_image: cover_image
                  ? {
                      url: cover_image_url ?? null,
                      x: cover_image?.x ?? null,
                      y: cover_image?.y ?? null,
                      width: cover_image?.width ?? null,
                      height: cover_image?.height ?? null,
                      zoom: cover_image?.zoom ?? null,
                      type: cover_image?.type ?? null,
                      calculatedImage: null,
                      isLoading: true,
                    }
                  : undefined,
                isGuest: response.data.user.is_anonymous ?? false,
              }
            : null,
        );
      }
    });
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const { data, error } = await getValidatedUser();
        if (error || data === null) {
          window.location.pathname = '/sign-in';
          return;
        }
      }
    };
    const handleOnlineChange = async () => {
      const { data, error } = await getValidatedUser();
      if (error || data === null) {
        window.location.pathname = '/sign-in';
        return;
      }
      queryClient.invalidateQueries();
    };
    window.addEventListener('online', handleOnlineChange);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      authListener.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnlineChange);
    };
  }, [setUser]);
  return null;
}

function ActiveSpaceLoader() {
  const { data: spaces, isLoading } = useQuery(getAllSpacesQueryOptions);
  const { setActiveSpace } = useActions();
  const activeSpace = useSelector((state) => state.activeSpace);
  useEffect(() => {
    if (!isLoading && spaces) {
      const freshActiveSpace = spaces?.find((space) => space.id === activeSpace?.id);
      if (freshActiveSpace && Boolean(freshActiveSpace.isContainer) == false) {
        const path = calculateSpacePath(freshActiveSpace.id, spaces as Space[]);
        setActiveSpace({
          ...freshActiveSpace,
          icon: freshActiveSpace.icon as Space['icon'],
          path,
        });
      } else {
        const space = spaces.find((s) => Boolean(s.isContainer) == false);
        if (!space) return;
        const path = calculateSpacePath(space.id, spaces as Space[]);
        setActiveSpace({
          ...space,
          icon: space.icon as Space['icon'],
          path,
        });
      }
    }
  }, [spaces, isLoading]);
  useEffect(() => {
    if (spaces && !isLoading) {
      if (activeSpace) {
        const activeSpaceFullData = spaces?.find((space) => space.id === activeSpace.id);
        if (activeSpaceFullData && activeSpaceFullData.isContainer) {
          const space = spaces.find((s) => Boolean(s.isContainer) == false);
          if (!space) return;
          const path = calculateSpacePath(space.id, spaces as Space[]);
          setActiveSpace({
            ...space,
            icon: space.icon as Space['icon'],
            path,
          });
        }
      }
    }
  }, [activeSpace]);
  return null;
}

function RealTimeChangeListener() {
  const queryClient = useQueryClient();
  const removeFromCache = useRemoveWithDescendantsFromCache();
  const invalidate = useAllQueriesInvalidate();
  useEffect(() => {
    const channel = supabase
      .channel('spaces_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: 'type=eq.space',
        },
        async (payload) => {
          switch (payload.eventType) {
            case 'UPDATE':
              if (payload.new.deleted_at) {
                // delete the space from the cache
                removeFromCache(getAllSpacesQueryOptions.queryKey, payload.old.id);
                removeSpaceFromCache(payload.old.client_id ?? payload.old.id);
              } else {
                const { data: space } = await getSpaceById(payload.new.id);
                if (space) {
                  let isApplied = false;
                  queryClient.setQueryData(
                    getAllSpacesQueryOptions.queryKey,
                    (old: ListSpaceResult) =>
                      old.map((s) => {
                        if (s.id === space.id) {
                          isApplied = true;
                          return space;
                        }
                        return s;
                      }),
                  );
                  if (!isApplied) {
                    queryClient.setQueryData(
                      getAllSpacesQueryOptions.queryKey,
                      (old: ListSpaceResult) => [...old, space],
                    );
                  }
                }
              }
              break;
            case 'INSERT': {
              if (!isSpaceCached(payload.new.client_id)) {
                addSpaceToCache(payload.new.client_id ?? payload.new.id);
                const { data: space } = await getSpaceById(payload.new.id);
                if (space) {
                  try {
                    queryClient.setQueryData(
                      getAllSpacesQueryOptions.queryKey,
                      (old: ListSpaceResult) => [...old, space],
                    );
                  } catch (error) {
                    // ignore
                  }
                }
              }
              break;
            }
          }
          // if (
          //   payload.eventType === "UPDATE" ||
          //   payload.eventType === "INSERT"
          // ) {
          //   queryClient.invalidateQueries({
          //     queryKey: getAllSpacesQueryOptions.queryKey,
          //     exact: true,
          //   });
          // }
          invalidate([SPACES_QUERY_KEYS.HOME.BASE, SPACES_QUERY_KEYS.FAVORITES]);
        },
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, []);
  useEffect(() => {
    const channel = supabase
      .channel('documents_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: 'type=neq.space',
        },
        async (payload) => {
          switch (payload.eventType) {
            case 'INSERT': {
              if (!isDocumentCached(payload.new.client_id)) {
                addDocumentToCache(payload.new.client_id ?? payload.new.id, 'real-time');
                const { data: document } = await getDocumentById(payload.new.id);
                if (document) {
                  try {
                    queryClient.setQueryData(
                      getAllDocumentsQueryOptions(payload.new.space_id).queryKey,
                      (old: ListDocumentResult) => [...old, document],
                    );
                  } catch {
                    // ignore
                  }
                }
              }
              break;
            }
            case 'UPDATE': {
              if (payload.new.deleted_at) {
                // delete the document from the cache
                removeFromCache(
                  getAllDocumentsQueryOptions(payload.new.space_id).queryKey,
                  payload.new.id,
                );
                removeDocumentFromCache(payload.new.client_id ?? payload.new.id);
              } else {
                if (payload.new.space_id !== payload.old.space_id) {
                  queryClient.setQueryData(
                    getAllDocumentsQueryOptions(payload.old.space_id).queryKey,
                    (old: ListDocumentResult) => {
                      return old?.filter?.((d) => d.id !== payload.old.id);
                    },
                  );
                  removeDocumentFromCache(payload.new.client_id ?? payload.new.id);
                  const isQueryExist = queryClient.getQueryData(
                    getAllDocumentsQueryOptions(payload.new.space_id).queryKey,
                  );
                  if (isQueryExist) {
                    const { data } = await getDocumentById(payload.new.id);
                    if (data) {
                      queryClient.setQueryData(
                        getAllDocumentsQueryOptions(payload.new.space_id).queryKey,
                        (old: ListDocumentResult) => {
                          return [...old, data];
                        },
                      );
                    }
                  }
                } else {
                  const inCacheDocument = (
                    queryClient.getQueryData(
                      getAllDocumentsQueryOptions(payload.new.space_id).queryKey,
                    ) as ListDocumentResult
                  )?.find((d) => d.id === payload.new.id);

                  const { data: document } = await getDocumentById(payload.new.id);
                  if (document) {
                    if (inCacheDocument) {
                      let isApplied = false;
                      queryClient.setQueryData(
                        getAllDocumentsQueryOptions(payload.new.space_id).queryKey,
                        (old: ListDocumentResult) => {
                          return old.map((d) => {
                            if (d.id === document.id) {
                              isApplied = true;
                              return document;
                            }
                            return d;
                          });
                        },
                      );
                      if (!isApplied) {
                        queryClient.invalidateQueries({
                          queryKey: getAllDocumentsQueryOptions(payload.new.space_id).queryKey,
                          exact: true,
                        });
                      }
                    }
                  }
                }
              }
              break;
            }
          }

          invalidate([DOCUMENTS_QUERY_KEYS.HOME.BASE, DOCUMENTS_QUERY_KEYS.FAVORITES]);
        },
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('favorites_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'favorites',
        },
        async (payload) => {
          switch (payload.eventType) {
            case 'INSERT': {
              const { data: favorite } = await getDocumentById(payload.new.document_id);
              if (favorite) {
                if (favorite.type === 'space') {
                  let isApplied = false;
                  queryClient.setQueryData(
                    getAllSpacesQueryOptions.queryKey,
                    (old: ListSpaceResult) => {
                      return old.map((s) => {
                        if (s.id === favorite.id) {
                          isApplied = true;
                          return favorite;
                        }
                        return s;
                      });
                    },
                  );
                  if (!isApplied) {
                    try {
                      queryClient.setQueryData(
                        getAllSpacesQueryOptions.queryKey,
                        (old: ListSpaceResult) => [...old, favorite],
                      );
                    } catch {
                      // ignore
                    }
                  }
                } else {
                  let isApplied = false;
                  queryClient.setQueryData(
                    getAllDocumentsQueryOptions(favorite.spaceId!).queryKey,
                    (old: ListDocumentResult) => {
                      return old.map((d) => {
                        if (d.id === favorite.id) {
                          isApplied = true;
                          return favorite;
                        }
                        return d;
                      });
                    },
                  );
                  if (!isApplied) {
                    try {
                      queryClient.setQueryData(
                        getAllDocumentsQueryOptions(favorite.spaceId!).queryKey,
                        (old: ListDocumentResult) => [...old, favorite],
                      );
                    } catch {
                      // ignore
                    }
                  }
                }
              }
              invalidate([DOCUMENTS_QUERY_KEYS.HOME.BASE, SPACES_QUERY_KEYS.HOME.BASE]);
              break;
            }
            case 'UPDATE': {
              if (payload.new.deleted_at) {
                const { data: favorite } = await getDocumentById(payload.new.document_id);
                if (favorite) {
                  queryClient.setQueryData(
                    getAllDocumentsQueryOptions(favorite.spaceId!).queryKey,
                    (old: ListDocumentResult) =>
                      old.map((d) => {
                        if (d.id === favorite.id) {
                          return favorite;
                        }
                        return d;
                      }),
                  );
                }
                invalidate([DOCUMENTS_QUERY_KEYS.HOME.BASE, SPACES_QUERY_KEYS.HOME.BASE]);
              }
              break;
            }
          }
        },
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, []);
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
      try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.crossOrigin = 'anonymous';
          img.src = src;
        });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

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

        // Convert canvas to data URL instead of blob
        return canvas.toDataURL('image/png', 0.95);
      } catch (error) {
        console.error('Error creating cropped image:', error);
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
function VersionChangeListener() {
  const reload = useCallback(() => {
    const url = window.location.href.split('?')[0];
    const timestamp = new Date().getTime();
    window.location.replace(`${url}?v=${timestamp}`);
  }, []);
  const { version, deployment_id } = useSelector((state) => ({
    version: state.version,
    deployment_id: state.deployment_id,
  }));
  const toastVersion = useRef<{
    version: string;
    deployment_id: string;
    toastId: string | number;
  } | null>(null);
  useEffect(() => {
    const channel = supabase
      .channel('version_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deployments',
        },
        async (payload) => {
          switch (payload.eventType) {
            case 'INSERT':
            case 'UPDATE': {
              if (
                (toastVersion.current?.version !== payload.new.version_number &&
                  version !== payload.new.version_number) ||
                (toastVersion.current?.deployment_id !== payload.new.deployment_id &&
                  deployment_id !== payload.new.deployment_id)
              ) {
                toast.dismiss(toastVersion.current?.toastId);
                toastVersion.current = {
                  toastId: toast('New update available', {
                    description: `New update of wordy app is now available, please refresh the page to get the latest updates!`,
                    action: {
                      label: <RotateCw className="size-4" />,
                      onClick: () => {
                        reload();
                      },
                    },
                    onAutoClose: (toast) => {
                      if (toastVersion.current?.toastId === toast.id) {
                        toastVersion.current = null;
                      }
                    },
                    onDismiss: (toast) => {
                      if (toastVersion.current?.toastId === toast.id) {
                        toastVersion.current = null;
                      }
                    },
                  }),
                  version: payload.new.version_number,
                  deployment_id: payload.new.deployment_id,
                };
              }
            }
          }
        },
      )
      .subscribe();
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const { data: versionData } = await getVersion();
        if (
          versionData &&
          (versionData.version_number !== version || versionData.deployment_id !== deployment_id)
        )
          if (
            toastVersion.current?.version !== versionData.version_number ||
            toastVersion.current?.deployment_id !== versionData.deployment_id
          ) {
            toastVersion.current = {
              toastId: toast('New update available', {
                description: `New update of wordy app is now available, please refresh the page to get the latest updates!`,
                action: {
                  label: <RotateCw className="size-4" />,
                  onClick: () => {
                    reload();
                  },
                },
                onAutoClose: (toast) => {
                  if (toastVersion.current?.toastId === toast.id) {
                    toastVersion.current = null;
                  }
                },
                onDismiss: (toast) => {
                  if (toastVersion.current?.toastId === toast.id) {
                    toastVersion.current = null;
                  }
                },
              }),
              version: versionData.version_number,
              deployment_id: versionData.deployment_id,
            };
          }
      }
    };
    const handleOnlineChange = async () => {
      if (navigator.onLine) {
        const { data: versionData } = await getVersion();
        if (
          versionData &&
          (versionData.version_number !== version || versionData.deployment_id !== deployment_id)
        )
          if (
            toastVersion.current?.version !== versionData.version_number ||
            toastVersion.current?.deployment_id !== versionData.deployment_id
          ) {
            toastVersion.current = {
              toastId: toast('New update available', {
                description: `New update of wordy app is now available, please refresh the page to get the latest updates!`,
                action: {
                  label: <RotateCw className="size-4" />,
                  onClick: () => {
                    reload();
                  },
                },
                onAutoClose: (toast) => {
                  if (toastVersion.current?.toastId === toast.id) {
                    toastVersion.current = null;
                  }
                },
                onDismiss: (toast) => {
                  if (toastVersion.current?.toastId === toast.id) {
                    toastVersion.current = null;
                  }
                },
              }),
              version: versionData.version_number,
              deployment_id: versionData.deployment_id,
            };
          }
      }
    };
    window.addEventListener('online', handleOnlineChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      channel.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnlineChange);
    };
  }, []);

  return null;
}
