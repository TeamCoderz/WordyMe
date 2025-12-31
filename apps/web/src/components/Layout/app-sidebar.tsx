'use client';

import * as React from 'react';

import { NavDocuments } from '@/components/Layout/nav-documents';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarSeparator,
} from '@repo/ui/components/sidebar';
import { SpaceSwitcher } from './space-switcher';
import { NavDocumentsContextMenu } from './document-tree/NavDocumentsContextMenu';

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
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
