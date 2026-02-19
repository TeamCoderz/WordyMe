/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';

import * as React from 'react';
import { HistoryIcon, Paperclip, Settings, TableOfContentsIcon } from '@repo/ui/components/icons';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@repo/ui/components/sidebar';
import { Activity, Suspense } from 'react';
import { TableOfContents, TableOfContentsHeader } from './TableOfContents';
import { cn } from '@repo/ui/lib/utils';
import { Button } from '@repo/ui/components/button';
import { Attachments, AttachmentsHeader } from './Attachments';
import { RevisionHistory, RevisionHistoryHeader } from './RevisionsHistory';
import { PageSetup, PageSetupHeader } from './PageSetup';
import { useLocalStorage } from '@repo/ui/hooks/use-local-storage';

const tabs = [
  {
    id: 'table-of-contents',
    title: 'Table of Contents',
    icon: TableOfContentsIcon,
  },
  {
    id: 'attachments',
    title: 'Attachments',
    icon: Paperclip,
  },
  {
    id: 'revisions',
    title: 'Revisions',
    icon: HistoryIcon,
  },
  {
    id: 'page-setup',
    title: 'Page Setup',
    icon: Settings,
  },
];

export function DocumentSidebar({
  handle,
  ...props
}: React.ComponentProps<typeof Sidebar> & { handle?: string }) {
  const [activeTab, setActiveTab] = useLocalStorage(
    'document-sidebar-active-tab',
    'table-of-contents',
  );
  const { open, openMobile, setOpen } = useSidebar();

  return (
    <Sidebar
      collapsible="icon"
      className={cn(
        'md:sticky overflow-hidden *:data-[sidebar=sidebar]:flex-row md:*:data-[sidebar=sidebar]:flex-row-reverse',
        'h-[calc(100svh---spacing(14)-1px)]! max-h-[calc(100svh---spacing(14)-1px)]! top-[calc(--spacing(14)+1px)]',
        'data-[state=closed]:translate-x-full',
      )}
      side="right"
      modal={false}
      forceMount={true}
      {...props}
    >
      <Sidebar
        collapsible="none"
        className="overflow-hidden w-[calc(var(--sidebar-width-icon)+1px)] bg-background text-foreground h-14 shrink-0 md:h-full items-center border-b md:border-b-0 md:border-l p-0 md:justify-center"
      >
        <SidebarHeader className="p-0 h-14 border-b hidden md:flex w-full justify-center items-center">
          <SidebarTrigger variant="outline" className="size-9 p-2! [&>svg]:rotate-180" />
        </SidebarHeader>
        <SidebarContent className="justify-center md:justify-start p-0 md:py-3 overflow-hidden">
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu className="flex flex-row justify-center md:flex-col scrollbar-thin w-full m-0 gap-2">
                {tabs.map((item) => (
                  <SidebarMenuItem key={item.id} className="h-9! flex justify-center items-center">
                    <Button
                      onClick={() => {
                        setActiveTab(item.id);
                        setOpen(!open || activeTab !== item.id);
                      }}
                      className={cn('size-9 justify-center items-center', {
                        'bg-accent text-accent-foreground':
                          (open || openMobile) && activeTab === item.id,
                      })}
                      variant="outline"
                    >
                      <item.icon />
                      <span className="sr-only">{item.title}</span>
                    </Button>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <Sidebar
        collapsible="none"
        className="overflow-hidden h-0 flex-1 md:h-full md:min-w-0 md:w-0 bg-background text-foreground"
      >
        <SidebarHeader className="p-0 h-14 border-b w-full justify-center items-start">
          <Activity mode={activeTab === 'table-of-contents' ? 'visible' : 'hidden'}>
            <TableOfContentsHeader />
          </Activity>
          <Activity mode={activeTab === 'attachments' ? 'visible' : 'hidden'}>
            <AttachmentsHeader />
          </Activity>
          <Activity mode={activeTab === 'revisions' ? 'visible' : 'hidden'}>
            <RevisionHistoryHeader />
          </Activity>
          <Activity mode={activeTab === 'page-setup' ? 'visible' : 'hidden'}>
            <PageSetupHeader />
          </Activity>
        </SidebarHeader>
        <SidebarContent className="overflow-hidden h-full text-sidebar-foreground">
          <SidebarGroup className="p-0 h-full">
            <SidebarGroupContent className="w-auto h-full">
              <Activity mode={activeTab === 'table-of-contents' ? 'visible' : 'hidden'}>
                <TableOfContents />
              </Activity>
              <Activity mode={activeTab === 'attachments' ? 'visible' : 'hidden'}>
                <Attachments />
              </Activity>
              <Activity mode={activeTab === 'revisions' ? 'visible' : 'hidden'}>
                <Suspense fallback={null}>
                  <RevisionHistory handle={handle ?? ''} />
                </Suspense>
              </Activity>
              <Activity mode={activeTab === 'page-setup' ? 'visible' : 'hidden'}>
                <PageSetup />
              </Activity>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  );
}
