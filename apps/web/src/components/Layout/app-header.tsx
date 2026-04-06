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
import { IS_MOBILE } from '@repo/shared/environment';
import SearchDocuments from './SearchDocuments';

export const AppHeader = () => {
  const handleGeometryChange = (event: any) => {
    const { height } = event.target.boundingRect;
    document.documentElement.style.setProperty('--keyboard-inset-height', `${height}px`);
  };

  useEffect(() => {
    if (!('virtualKeyboard' in navigator)) return;
    const virtualKeyboard = navigator.virtualKeyboard as any;
    virtualKeyboard.overlaysContent = true;
    virtualKeyboard.addEventListener('geometrychange', handleGeometryChange);
    return () => {
      virtualKeyboard.removeEventListener('geometrychange', handleGeometryChange);
    };
  }, []);

  const handleResize = () => {
    const keyboardInsetHeight = Math.ceil(
      window.innerHeight - (window.visualViewport?.height || window.innerHeight),
    );
    document.documentElement.style.setProperty(
      '--keyboard-inset-height',
      `${keyboardInsetHeight}px`,
    );
  };

  useEffect(() => {
    if ('virtualKeyboard' in navigator) return;
    if (!IS_MOBILE) return;
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
          'group group/app-header text-accent-foreground sticky top-0 z-50 flex w-full items-center border-b bg-top-bar-primary',
        )}
      >
        <div className="flex w-full h-14 justify-between items-center overflow-hidden">
          <div
            className={cn(
              'flex justify-between items-center gap-2 h-full px-4 shrink-0 w-56 sm:w-(--sidebar-width) sm:border-r',
            )}
          >
            <Link to="/" className="flex items-center font-logo gap-2 shrink-0" data-new-tab="true">
              <img src={logo} alt="Wordy" className="size-8" />
              <p className="font-extrabold text-lg font-logo">Wordy</p>
            </Link>
            <SidebarTrigger variant="outline" className="size-9 p-2!" />
          </div>
          <div className="flex items-center gap-2 px-4">
            <SearchDocuments />
            <ThemeCustomizer />
            <NavUser variant="avatar" dropdownMenuSide="bottom" className="w-auto size-8" />
          </div>
        </div>
      </header>
    </>
  );
};
