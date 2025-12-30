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

export const Route = createRootRouteWithContext<{
  store: AppStoreApi;
  queryClient: QueryClient;
  session: {
    data: SessionData;
    isLoading: boolean;
  };
}>()({
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
