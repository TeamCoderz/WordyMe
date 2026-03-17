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
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@repo/ui/components/sidebar';
import { Activity, Suspense, useEffect } from 'react';
import { TableOfContents, TableOfContentsHeader } from './TableOfContents';
import { cn } from '@repo/ui/lib/utils';
import { Button } from '@repo/ui/components/button';
import { Attachments, AttachmentsHeader } from './Attachments';
import { RevisionHistory, RevisionHistoryHeader } from './RevisionsHistory';
import { PageSetup, PageSetupHeader } from './PageSetup';
import { useCallback, useMemo, useState } from 'react';
import { useSelector, useActions } from '@/store';
import { Portal } from '@repo/ui/components/portal';
import { useContainerQuery } from '@repo/ui/hooks/use-container-query';
import { ScrollArea } from '@repo/ui/components/scroll-area';
import { useRouteContext } from '@tanstack/react-router';

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

export function DocumentSidebarComponent({
  handle,
  ...props
}: React.ComponentProps<typeof Sidebar> & { handle?: string }) {
  const documentSidebarActiveTab = useSelector((state) => state.ui.documentSidebarActiveTab);
  const { setDocumentSidebarActiveTab } = useActions();
  const [activeTab, setActiveTab] = useState(documentSidebarActiveTab);
  const { open, openMobile, setOpen } = useSidebar();

  useEffect(() => {
    setDocumentSidebarActiveTab(activeTab);
  }, [activeTab, setDocumentSidebarActiveTab]);

  return (
    <Sidebar
      collapsible="icon"
      className={cn(
        'md:sticky overflow-hidden *:data-[sidebar=sidebar]:flex-row md:*:data-[sidebar=sidebar]:flex-row-reverse',
        'h-[calc(100svh---spacing(28)-2px)]! max-h-[calc(100svh---spacing(28)-2px)]! top-[calc(var(--spacing)*28+2px)] md:top-0',
        'data-[state=closed]:translate-x-full',
      )}
      side="right"
      modal={false}
      forceMount={true}
      {...props}
    >
      <Sidebar
        collapsible="none"
        className="overflow-hidden w-(--sidebar-width-icon) bg-background text-foreground h-14 shrink-0 md:h-full items-center border-b md:border-b-0 md:border-l p-0 md:justify-center"
      >
        <SidebarHeader className="p-0 h-14 border-b hidden md:flex w-full justify-center items-center">
          <SidebarTrigger variant="outline" className="size-9 p-2! [&>svg]:rotate-180" />
        </SidebarHeader>
        <SidebarContent className="justify-center md:justify-start p-0 md:py-3 overflow-hidden">
          <ScrollArea>
            <SidebarGroup className="p-0">
              <SidebarGroupContent>
                <SidebarMenu className="flex flex-row justify-center md:flex-col w-full m-0 gap-2">
                  {tabs.map((item) => (
                    <SidebarMenuItem
                      key={item.id}
                      className="h-9! flex justify-center items-center"
                    >
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
          </ScrollArea>
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
          <ScrollArea className="h-full [&>[data-radix-scroll-area-viewport]>div[style]]:block!">
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
          </ScrollArea>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  );
}

export interface DocumentSidebarProps {
  children: React.ReactNode;
  handle?: string;
}

function useDefaultDocumentSidebarOpen() {
  const documentSidebar = useSelector((state) => state.ui.documentSidebar);
  const documentSidebarOpen = useSelector((state) => state.ui.documentSidebarOpen);

  return useMemo(() => {
    if (documentSidebar === 'expanded') return true;
    if (documentSidebar === 'collapsed') return false;
    if (documentSidebar === 'remember') return documentSidebarOpen;
    return true;
  }, [documentSidebar, documentSidebarOpen]);
}

const sidebarProviderClassName = cn(
  'group/document-sidebar relative flex flex-1 flex-col items-center min-h-auto h-full',
  '**:data-collapsible:sticky **:data-collapsible:top-0 **:data-collapsible:z-50',
);

const sidebarProviderStyle = {
  '--sidebar-width': 'calc(var(--spacing) * 90)',
  '--sidebar-width-icon': 'calc(var(--spacing) * 14)',
} as React.CSSProperties;

export function DocumentSidebar({ children, handle }: DocumentSidebarProps) {
  const { splitPaneType } = useRouteContext({ from: '__root__' });
  const paneSelector = `[data-pane="${splitPaneType}"]`;
  const sidebarTriggerSelector = `[data-pane="${splitPaneType}"] #document-sidebar-trigger`;
  const documentSidebar = useSelector((state) => state.ui.documentSidebar);
  const { setDocumentSidebarOpen } = useActions();
  const isDesktop = useContainerQuery(paneSelector, '(width >= 1024px)');
  const defaultOpen = useDefaultDocumentSidebarOpen();
  const [openDesktop, setOpenDesktop] = useState(defaultOpen);
  const [openMobile, setOpenMobile] = useState(false);

  const toggleSidebar = useCallback(
    (open: boolean) => {
      if (isDesktop) {
        setOpenDesktop(open);
        if (documentSidebar === 'remember') setDocumentSidebarOpen(open);
      } else {
        setOpenMobile(open);
      }
    },
    [isDesktop, documentSidebar, setDocumentSidebarOpen],
  );

  const open = isDesktop == undefined ? undefined : isDesktop ? openDesktop : openMobile;

  return (
    <SidebarProvider
      className={sidebarProviderClassName}
      style={sidebarProviderStyle}
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={toggleSidebar}
    >
      <div className="flex flex-1 justify-center w-full h-full items-start relative">
        {children}
        <Portal container={sidebarTriggerSelector}>
          <SidebarTrigger variant="outline" className="size-9 p-2! [&>svg]:rotate-180 md:hidden" />
        </Portal>

        <DocumentSidebarComponent handle={handle} />
      </div>
    </SidebarProvider>
  );
}
