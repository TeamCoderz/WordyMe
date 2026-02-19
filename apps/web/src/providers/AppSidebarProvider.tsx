/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useMemo, type PropsWithChildren } from 'react';
import { SidebarProvider } from '@repo/ui/components/sidebar';
import { cn } from '@repo/ui/lib/utils';
import { useSelector } from '@/store';

type SidebarProviderProps = React.ComponentProps<typeof SidebarProvider>;

export function AppSidebarProvider({
  children,
  className,
  ...rest
}: PropsWithChildren<SidebarProviderProps>) {
  const sidebar = useSelector((state) => state.sidebar);

  const defaultOpen = useMemo(() => {
    if (sidebar === 'expanded') return true;
    if (sidebar === 'collapsed') return false;

    if (typeof document === 'undefined') return true;

    const match = document.cookie.match(/(?:^|; )sidebar_state=([^;]*)/);
    if (!match) return true;
    try {
      return decodeURIComponent(match[1]) === 'true';
    } catch {
      return match[1] === 'true';
    }
  }, [sidebar]);
  return (
    <SidebarProvider
      className={cn('group/app-sidebar flex flex-col', className)}
      defaultOpen={defaultOpen}
      {...rest}
    >
      {children}
    </SidebarProvider>
  );
}

export default AppSidebarProvider;
