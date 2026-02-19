/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { createFileRoute, Outlet } from '@tanstack/react-router';
import SettingsHeader from '@/components/Settings/SettingsHeader';
import UserImages from '@/components/Settings/UserImages';
import SettingsNav from '@/components/Settings/SettingsNav';

export const Route = createFileRoute('/_authed/settings')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
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
    </>
  );
}
