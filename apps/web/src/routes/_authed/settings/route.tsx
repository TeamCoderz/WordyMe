/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useEffect, useRef } from 'react';
import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router';
import SettingsHeader from '@/components/Settings/SettingsHeader';
import UserImages from '@/components/Settings/UserImages';
import SettingsNav from '@/components/Settings/SettingsNav';

export const Route = createFileRoute('/_authed/settings')({
  component: RouteComponent,
});

const scrollPaneToTop = (from: HTMLElement | null) => {
  let element = from?.parentElement ?? null;

  while (element) {
    const overflowY = getComputedStyle(element).overflowY;
    if (/(auto|scroll)/.test(overflowY) && element.scrollHeight > element.clientHeight) {
      element.scrollTo({ top: 0 });
      return;
    }
    element = element.parentElement;
  }
};

function RouteComponent() {
  const paneRef = useRef<HTMLDivElement>(null);
  const { pathname, searchStr } = useLocation();

  useEffect(() => {
    scrollPaneToTop(paneRef.current);
  }, [pathname, searchStr]);

  return (
    <div ref={paneRef}>
      <SettingsHeader />
      <UserImages />
      <div className="@container">
        <div className="grid grid-cols-1 @2xl:grid-cols-[260px_1fr] gap-6 px-6 max-w-7xl mx-auto">
          <SettingsNav />
          <div className="pb-10">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
