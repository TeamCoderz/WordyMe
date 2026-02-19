/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { ImageZoom } from './image-zoom';
import { useMemo, useRef, useState } from 'react';
import { useCallback } from 'react';
import { useMediaQuery } from '@repo/ui/hooks/use-media-query';
import { SidebarProvider } from '@repo/ui/components/sidebar';
import { cn } from '@repo/ui/lib/utils';
import type { LexicalEditor } from '@repo/editor/types';
import { DocumentSidebar } from './document-sidebar';
import { EditorComposer } from '@repo/editor/EditorComposer';
import { useServices } from './useServices';
import { Viewer } from '@repo/editor/Viewer';
import { useSelector } from '@/store';

interface ViewDocumentProps {
  userId: string;
  documentId: string;
  documentHandle: string;
  revisionId?: string;
  initialState?: string;
}

export function ViewDocument({
  userId,
  documentId,
  documentHandle,
  revisionId,
  initialState,
}: ViewDocumentProps) {
  const sidebar = useSelector((state) => state.sidebar);

  const defaultOpen = useMemo(() => {
    if (sidebar === 'expanded') return true;
    if (sidebar === 'collapsed') return false;

    if (typeof document === 'undefined') return true;

    const match = window.document.cookie.match(/(?:^|; )sidebar_state=([^;]*)/);
    if (!match) return true;
    try {
      return decodeURIComponent(match[1]) === 'true';
    } catch {
      return match[1] === 'true';
    }
  }, [sidebar]);

  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [openDesktop, setOpenDesktop] = useState(defaultOpen);
  const [openMobile, setOpenMobile] = useState(false);

  const toggleSidebar = useCallback(
    (open: boolean) => {
      return isDesktop ? setOpenDesktop(open) : setOpenMobile(open);
    },
    [isDesktop, setOpenDesktop, setOpenMobile],
  );

  const editorRef = useRef<LexicalEditor>(null);
  const services = useServices(documentId, userId);

  return (
    <SidebarProvider
      className={cn(
        'group/editor-sidebar relative flex flex-1 flex-col items-center min-h-auto',
        '**:data-collapsible:sticky **:data-collapsible:top-[calc(--spacing(14)+1px)]',
      )}
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 90)',
          '--sidebar-width-icon': 'calc(var(--spacing) * 14)',
        } as React.CSSProperties
      }
      open={isDesktop ? openDesktop : openMobile}
      onOpenChange={toggleSidebar}
    >
      <EditorComposer
        key={revisionId ?? documentId}
        initialState={initialState ?? null}
        editable={false}
        services={services}
        editorRef={editorRef}
      >
        <div className="flex flex-1 justify-center w-full h-full items-start relative">
          <ImageZoom />
          <Viewer />
          <DocumentSidebar handle={documentHandle} />
        </div>
      </EditorComposer>
    </SidebarProvider>
  );
}
