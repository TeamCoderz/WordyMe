/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Outlet, createRootRouteWithContext, useBlocker } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { Toaster } from '@repo/ui/components/sonner';
import { Alert } from '@/components/Layout/alert';
import { SidebarInset } from '@repo/ui/components/sidebar';
import { AppSidebarProvider } from '@/providers/AppSidebarProvider';
import { AppHeader } from '@/components/Layout/app-header';
import { AppSidebar } from '@/components/Layout/app-sidebar';
import { store, useSelector } from '@/store';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import SplashScreen from '@/components/splash-screen';
import {
  getShouldBlockNavigation,
  setShouldBlockNavigation,
  dispatchNavigationBlockedEvent,
} from '@repo/shared/navigation';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@repo/ui/components/resizable';
import { SplitPaneRouter } from '@/components/Layout/SplitPaneRouter';
import { useActions } from '@/store';
import { useMediaQuery } from '@repo/ui/hooks/use-media-query';
import { TabSync, PaneTabBar, TabDndProvider, PaneContent } from '@/components/Layout/tabs';
import { cn } from '@repo/ui/lib/utils';
import { SessionData } from '@repo/sdk/auth';

export const Route = createRootRouteWithContext<{
  store: typeof store;
  queryClient: QueryClient;
  session: {
    data: SessionData;
    isLoading: boolean;
  };
  isSplitPane?: boolean;
  splitPaneType?: 'primary' | 'secondary' | null;
  tabId?: string;
}>()({
  component: Root,
  pendingComponent: () => <SplashScreen className="absolute" />,
  notFoundComponent: () => <SplashScreen className="absolute" title="Page not found" />,
  errorComponent: () => (
    <SplashScreen
      className="absolute"
      title="An unexpected error occurred"
      subtitle="Please refresh the page"
    />
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
  const { isSplitPane } = Route.useRouteContext();
  if (isSplitPane) return <Outlet />;
  return <RootLayout />;
}

function RootLayout() {
  const user = useSelector((state) => state.user);
  const queryClient = useQueryClient();
  const activePane = useSelector((state) => state.tabs.activePane);
  const splitRatio = useSelector((state) => state.tabs.splitRatio);
  const { setSplitRatio, setActivePane } = useActions();
  const primaryActiveTab = useSelector((state) =>
    state.tabs.tabList.find((t) => t.id === state.tabs.activeTabId.primary),
  );
  const secondaryActiveTab = useSelector(
    (state) => state.tabs.tabList.find((t) => t.id === state.tabs.activeTabId.secondary) ?? null,
  );
  const hasSplit = !!primaryActiveTab && !!secondaryActiveTab;

  const isPortrait = useMediaQuery('(orientation: portrait)');
  const isCoarsePointer = useMediaQuery('(pointer: coarse)');
  const splitDirection = isPortrait ? 'vertical' : 'horizontal';
  const panelMinSize = isCoarsePointer ? 260 : 412;

  const handleLayoutChanged = useCallback(
    (layout: Record<string, number>) => {
      setSplitRatio(layout.primary);
    },
    [setSplitRatio],
  );

  useEffect(() => {
    if (!user) {
      queryClient.clear();
    }
  }, [user]);

  if (!user)
    return (
      <>
        <NavigationBlocker />
        <Alert />
        <Outlet />
        <TanStackRouterDevtools />
        <Toaster />
      </>
    );

  return (
    <>
      <NavigationBlocker />
      <TabSync />
      <Alert />
      <AppSidebarProvider>
        <AppHeader />
        <div className="relative flex flex-1 h-[calc(100svh---spacing(14)-1px)]! max-h-[calc(100svh---spacing(14)-1px)]! print:h-auto print:max-h-none!">
          <AppSidebar />
          <SidebarInset className="w-0 flex-1">
            <TabDndProvider>
              <ResizablePanelGroup
                onLayoutChanged={handleLayoutChanged}
                orientation={splitDirection as 'horizontal' | 'vertical'}
                resizeTargetMinimumSize={{ coarse: 37, fine: 20 }}
                style={
                  {
                    '--split-ratio': `${hasSplit ? splitRatio : 100}%`,
                  } as React.CSSProperties
                }
                className={cn(
                  'flex-1 *:grow print:flex-row! print:*:h-auto! print:*:max-h-none! print:*:hidden!',
                  {
                    'print:*:first:flex!': activePane === 'primary',
                    'print:*:last:flex!': activePane === 'secondary',
                    '*:first:max-h-[calc(var(--split-ratio)-var(--keyboard-inset-height))]!':
                      isPortrait && activePane === 'secondary',
                  },
                )}
              >
                <ResizablePanel
                  id="primary"
                  defaultSize={splitRatio}
                  minSize={panelMinSize}
                  className={cn('@container', {
                    'print:hidden!': activePane === 'secondary',
                  })}
                  onMouseDown={() => setActivePane('primary')}
                >
                  <div
                    data-pane="primary"
                    className="relative flex flex-col h-full overflow-hidden"
                  >
                    <PaneTabBar pane="primary" />
                    <PaneContent pane="primary">
                      {primaryActiveTab && (
                        <SplitPaneRouter tab={primaryActiveTab} type="primary" />
                      )}
                    </PaneContent>
                  </div>
                </ResizablePanel>
                {hasSplit && (
                  <>
                    <ResizableHandle
                      withHandle
                      className="print:hidden! z-50 *:z-50 focus-visible:shadow-[none] aria-[orientation=horizontal]:min-h-4 aria-[orientation=vertical]:min-w-4 flex-0!"
                    />
                    <ResizablePanel
                      defaultSize={100 - splitRatio}
                      minSize={panelMinSize}
                      className={cn('@container', {
                        'print:hidden!': activePane === 'primary',
                      })}
                      onMouseDown={() => setActivePane('secondary')}
                    >
                      <div
                        data-pane="secondary"
                        className="relative flex flex-col h-full overflow-hidden"
                      >
                        <PaneTabBar pane="secondary" />
                        <PaneContent pane="secondary">
                          <SplitPaneRouter tab={secondaryActiveTab} type="secondary" />
                        </PaneContent>
                      </div>
                    </ResizablePanel>
                  </>
                )}
              </ResizablePanelGroup>
            </TabDndProvider>
          </SidebarInset>
        </div>
      </AppSidebarProvider>
      <TanStackRouterDevtools />
      <Toaster />
    </>
  );
}
