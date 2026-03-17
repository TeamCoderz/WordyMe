/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useCallback, useMemo, useState, type PropsWithChildren } from 'react';
import { SidebarProvider } from '@repo/ui/components/sidebar';
import { cn } from '@repo/ui/lib/utils';
import { useSelector, useActions } from '@/store';

type SidebarProviderProps = React.ComponentProps<typeof SidebarProvider>;

function AppSidebarInner({
  defaultOpen,
  children,
  className,
  ...rest
}: PropsWithChildren<SidebarProviderProps & { defaultOpen: boolean }>) {
  const appSidebar = useSelector((state) => state.ui.appSidebar);
  const { setAppSidebarOpen } = useActions();
  const [open, setOpen] = useState(defaultOpen);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      setOpen(newOpen);
      if (appSidebar === 'remember') setAppSidebarOpen(newOpen);
    },
    [appSidebar, setAppSidebarOpen],
  );

  return (
    <SidebarProvider
      className={cn('group/app-sidebar flex flex-col', className)}
      defaultOpen={defaultOpen}
      {...rest}
      open={open}
      onOpenChange={handleOpenChange}
    >
      {children}
    </SidebarProvider>
  );
}

export function AppSidebarProvider({
  children,
  className,
  ...rest
}: PropsWithChildren<SidebarProviderProps>) {
  const appSidebar = useSelector((state) => state.ui.appSidebar);
  const appSidebarOpen = useSelector((state) => state.ui.appSidebarOpen);

  const defaultOpen = useMemo(() => {
    if (appSidebar === 'expanded') return true;
    if (appSidebar === 'collapsed') return false;
    if (appSidebar === 'remember') return appSidebarOpen;
    return true;
  }, [appSidebar, appSidebarOpen]);

  return (
    <AppSidebarInner key={appSidebar} defaultOpen={defaultOpen} className={className} {...rest}>
      {children}
    </AppSidebarInner>
  );
}

export default AppSidebarProvider;
