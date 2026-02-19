/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import logo from '@/logo.webp';
import { SidebarTrigger } from '@repo/ui/components/sidebar';
import { useEffect } from 'react';
import { ThemeCustomizer } from '@repo/ui/theme/theme-customizer';
import { NavUser } from './nav-user';
import { cn } from '@repo/ui/lib/utils';
import { Link } from '@tanstack/react-router';
import { TabBar } from './tabs';

export const AppHeader = () => {
  const handleResize = () => {
    const keyboardInsetHeight =
      window.innerHeight - (window.visualViewport?.height || window.innerHeight);
    document.documentElement.style.setProperty(
      '--keyboard-inset-height',
      `${keyboardInsetHeight}px`,
    );
  };

  useEffect(() => {
    if (!window.visualViewport) return;
    window.visualViewport.addEventListener('resize', handleResize);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <>
      <header
        className={cn(
          'group group/app-header text-accent-foreground sticky top-0 z-50 flex w-full items-center border-b bg-background',
        )}
      >
        <div className="flex w-full h-14 items-center overflow-hidden">
          <div
            className={cn(
              'flex justify-between items-center gap-2 h-full px-4 bg-top-bar-primary shrink-0',
              'w-28 sm:w-56 md:w-(--sidebar-width) md:border-r transition-[width] duration-100 ease-linear',
              'max-sm:group-has-[#app-toolbar:empty]/app-header:w-56',
            )}
          >
            <Link to="/" className="flex items-center font-logo gap-2 shrink-0">
              <img src={logo} alt="Wordy" className="size-8" />
              <p className="hidden max-sm:group-has-[#app-toolbar:empty]/app-header:block sm:block font-extrabold text-lg font-logo">
                Wordy
              </p>
            </Link>
            <SidebarTrigger variant="outline" className="size-9 !p-2" />
          </div>
          <TabBar className="flex-1 min-w-0 h-full" />
          <div className="flex items-center gap-2 px-4">
            <ThemeCustomizer />
            <NavUser variant="avatar" dropdownMenuSide="bottom" className="w-auto size-8" />
          </div>
        </div>
      </header>
    </>
  );
};
