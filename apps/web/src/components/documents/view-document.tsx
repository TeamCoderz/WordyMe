import { ImageZoom } from './image-zoom';
import { ViewDocumentActions } from './view-document-actions';
import type { Document, User } from '@repo/types';
import { useMemo, useRef, useState } from 'react';
import { useCallback } from 'react';
import { useMediaQuery } from '@repo/ui/hooks/use-media-query';
import { SidebarProvider } from '@repo/ui/components/sidebar';
import { cn } from '@repo/ui/lib/utils';
import type { LexicalEditor } from '@repo/editor/types';
import { DocumentSidebar } from './document-sidebar';
import { EditorComposer } from '@repo/editor/EditorComposer';
import { getServices } from './services';
import { Viewer } from '@repo/editor/Viewer';

interface ViewDocumentProps {
  user: User;
  document: Document;
  initialState?: string;
}

export function ViewDocument({ document, initialState }: ViewDocumentProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [openDesktop, setOpenDesktop] = useState(true);
  const [openMobile, setOpenMobile] = useState(false);

  const toggleSidebar = useCallback(
    (open: boolean) => {
      return isDesktop ? setOpenDesktop(open) : setOpenMobile(open);
    },
    [isDesktop, setOpenDesktop, setOpenMobile],
  );

  const editorRef = useRef<LexicalEditor>(null);

  const services = useMemo(() => getServices(document.id), [document.id]);

  return (
    <SidebarProvider
      className={cn(
        'group/editor-sidebar relative flex flex-1 flex-col items-center min-h-auto',
        '**:data-[collapsible]:sticky **:data-[collapsible]:top-[calc(--spacing(14)+1px)]',
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
        key={document.id}
        initialState={initialState ?? null}
        editable={false}
        services={services}
        editorRef={editorRef}
      >
        <ViewDocumentActions handle={document.handle} />
        <div className="flex flex-1 justify-center w-full h-full items-start relative">
          <ImageZoom />
          <Viewer />
          <DocumentSidebar handle={document?.handle} />
        </div>
      </EditorComposer>
    </SidebarProvider>
  );
}
