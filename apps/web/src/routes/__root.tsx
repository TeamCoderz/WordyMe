import { Link, Outlet, createRootRouteWithContext, useBlocker } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { Toaster } from '@repo/ui/components/sonner';
import { Alert } from '@/components/Layout/alert';
import { useSelector } from '@/store';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import SplashScreen from '@/components/splash-screen';
import type { AppStoreApi } from '@/store/app-store';
import { Button } from '@repo/ui/components/button';
import {
  getShouldBlockNavigation,
  setShouldBlockNavigation,
  dispatchNavigationBlockedEvent,
} from '@repo/shared/navigation';
import { SessionData } from '@repo/sdk/auth';

async function clearBrowserStorage() {
  try {
    localStorage.removeItem('app_version');
    localStorage.removeItem('deployment_id');
  } catch {
    // no action
  }
}

export const Route = createRootRouteWithContext<{
  store: AppStoreApi;
  queryClient: QueryClient;
  session: {
    data: SessionData;
    isLoading: boolean;
  };
}>()({
  beforeLoad: async ({ context: { session } }) => {
    console.log(session);
    // throw redirect({ to: '/login' });
    // if (user === null) {
    //   // const { data, error } = await session.getValidatedUser(true);
    //   // if (error || data === null || data.error || data.data === null) return;
    //   // const { profile, user } = data.data;
    //   // const { data: userSession } = await supabase.auth.getSession();
    //   // await supabase.realtime.setAuth(userSession.session?.access_token);
    //   // const avatar = profile.user_images.find(
    //   //   (image) => image.type === "avatar",
    //   // );
    //   // const isAvatarURL = z.url().safeParse(avatar?.path ?? "");
    //   // const cover_image = profile.user_images.find(
    //   //   (image) => image.type === "cover",
    //   // );
    //   // const cover_image_url =
    //   //   cover_image?.path != null
    //   //     ? (await getUserImageSignedUrl(cover_image?.path ?? "")).data
    //   //         ?.signedUrl
    //   //     : null;
    //   // const avatar_image_url =
    //   //   avatar?.path != null && !isAvatarURL.success
    //   //     ? (await getUserImageSignedUrl(avatar?.path ?? "")).data?.signedUrl
    //   //     : (avatar?.path ?? null);
    //   // const { data: version } = await getVersion();
    //   // const localVersion = localStorage.getItem("app_version");
    //   // if (localVersion !== version?.version_number) {
    //   //   await clearBrowserStorage();
    //   //   localStorage.setItem("app_version", version?.version_number ?? "1.0.0");
    //   // }
    //   // const localDeploymentId = localStorage.getItem("deployment_id");
    //   // if (localDeploymentId !== version?.deployment_id) {
    //   //   localStorage.setItem("deployment_id", version?.deployment_id ?? "");
    //   // }
    //   // store.setState(() => ({
    //   //   user: profile
    //   //     ? {
    //   //         ...profile,
    //   //         editor_settings: profile.editor_settings,
    //   //         email: user.email,
    //   //         last_signed_in: user.last_sign_in_at,
    //   //         avatar_image: avatar
    //   //           ? {
    //   //               url: avatar_image_url ?? null,
    //   //               x: avatar?.x ?? null,
    //   //               y: avatar?.y ?? null,
    //   //               width: avatar?.width ?? null,
    //   //               height: avatar?.height ?? null,
    //   //               zoom: avatar?.zoom ?? null,
    //   //               type: avatar?.type ?? null,
    //   //               calculatedImage: null,
    //   //               isLoading: true,
    //   //               provider: isAvatarURL.success
    //   //                 ? "auth_provider"
    //   //                 : "supabase",
    //   //             }
    //   //           : undefined,
    //   //         cover_image: cover_image
    //   //           ? {
    //   //               url: cover_image_url ?? null,
    //   //               x: cover_image?.x ?? null,
    //   //               y: cover_image?.y ?? null,
    //   //               width: cover_image?.width ?? null,
    //   //               height: cover_image?.height ?? null,
    //   //               zoom: cover_image?.zoom ?? null,
    //   //               type: cover_image?.type ?? null,
    //   //               calculatedImage: null,
    //   //               isLoading: true,
    //   //             }
    //   //           : undefined,
    //   //         isGuest: user.is_anonymous ?? false,
    //   //       }
    //   //     : null,
    //   //   version: version?.version_number ?? "1.0.0",
    //   //   deployment_id: version?.deployment_id ?? "",
    //   // }));
    // }
  },

  loader: async ({ context: { store } }) => {
    // const { user } = store.getState();
    // if (user) {
    //   const activeSpace = store.getState().activeSpace;
    //   queryClient.ensureQueryData(getAllSpacesQueryOptions);
    //   queryClient.ensureQueryData(getAllDocumentsQueryOptions(activeSpace?.id ?? ''));
    //   store.setState((prev) => ({
    //     ...prev,
    //     navigation: {
    //       ...prev.navigation,
    //       secondary: [
    //         {
    //           id: 'settings',
    //           title: 'Settings',
    //           url: '/settings/profile',
    //           icon: 'settings-2',
    //         },
    //       ],
    //     },
    //   }));
    // }
  },
  component: Root,
  pendingComponent: () => <SplashScreen className="absolute" />,
  notFoundComponent: () => (
    <div className="w-full flex-1 flex items-center justify-center p-4 flex-col gap-4">
      <h1 className="text-2xl font-bold mb-4">404 - Page Not Found</h1>
      <Button variant="outline" asChild>
        <Link to="/">Go to Home Page</Link>
      </Button>
    </div>
  ),
  wrapInSuspense: true,
});

function NavigationBlocker() {
  useBlocker({
    enableBeforeUnload: false,
    shouldBlockFn: () => {
      if (getShouldBlockNavigation()) {
        setShouldBlockNavigation(false);
        dispatchNavigationBlockedEvent();
        return true;
      }
      return false;
    },
  });
  return null;
}

function Root() {
  const user = useSelector((state) => state.user);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) {
      queryClient.clear();
    }
  }, [user]);

  return (
    <>
      <NavigationBlocker />
      <Alert />
      <Outlet />
      <TanStackRouterDevtools />
      <Toaster />
    </>
  );
}
