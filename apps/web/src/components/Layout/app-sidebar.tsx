'use client';

import * as React from 'react';

import { NavDocuments } from '@/components/Layout/nav-documents';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarSeparator,
} from '@repo/ui/components/sidebar';
import { useSelector } from '@/store';
import { SpaceSwitcher } from './space-switcher';
import { FeedbackCard } from './document-tree/FeedbackCard';
import { NavDocumentsContextMenu } from './document-tree/NavDocumentsContextMenu';
import { GuestUserCard } from './GuestUserCard';

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const user = useSelector((state) => state.user);

  return (
    <Sidebar
      className="top-14 h-[calc(100svh---spacing(14))]! max-h-[calc(100svh---spacing(14))]!"
      modal={false}
      {...props}
    >
      <SidebarHeader className="h-14 p-1 justify-center">
        <SpaceSwitcher />
      </SidebarHeader>
      <SidebarSeparator className="mx-0 !h-[calc(var(--spacing)/4)] bg-border" />
      <NavDocumentsContextMenu>
        <SidebarContent className="overflow-hidden">
          <NavDocuments className="flex-1" />
          {user && (
            <div className="shrink-0 mt-auto">
              {user.isGuest ? <GuestUserCard /> : <FeedbackCard />}
            </div>
          )}
          {/* <NavMain items={navigation.main} />
        <NavSecondary items={navigation.secondary} /> */}
        </SidebarContent>
      </NavDocumentsContextMenu>
      {/* <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter> */}
    </Sidebar>
  );
}
