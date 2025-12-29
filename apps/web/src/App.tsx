import { RouterProvider, createRouter } from '@tanstack/react-router';
import { ThemeProvider } from '@repo/ui/theme/theme-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Import the generated route tree
import { routeTree } from './routeTree.gen.ts';
import { authClient } from '@repo/sdk/auth';

import { useAppStore } from './store';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import './App.css';

// Create a new router instance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15 * 60 * 1000,
    },
  },
});

const router = createRouter({
  routeTree,
  context: {
    store: undefined!,
    queryClient: queryClient,
    session: { data: null, isLoading: true },
  },
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
});

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// eslint-disable-next-line react-refresh/only-export-components

export const App = () => {
  const store = useAppStore();
  const { data: session, isPending, isRefetching } = authClient.useSession();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider storageKey="vite-ui-theme">
        <RouterProvider
          router={router}
          context={{
            store,
            queryClient,
            session: { data: session, isLoading: isPending || isRefetching },
          }}
        />
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </QueryClientProvider>
  );
};
