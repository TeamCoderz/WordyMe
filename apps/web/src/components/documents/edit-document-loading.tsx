import { Skeleton } from '@repo/ui/components/skeleton';
import { useMediaQuery } from '@repo/ui/hooks/use-media-query';
import { SidebarProvider } from '@repo/ui/components/sidebar';
import { cn } from '@repo/ui/lib/utils';
import { DocumentSidebar } from './document-sidebar';
import { EditorComposer } from '@repo/editor/EditorComposer';
import { getServices } from './services';
import { EditDocumentActions } from './edit-document-actions';
import ToolbarPlugin from '@repo/editor/plugins/ToolbarPlugin';

export function EditDocumentLoading({ handle }: { handle: string }) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const services = getServices();

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
      open={isDesktop}
    >
      <EditorComposer initialState={null} services={services} editable={false}>
        <EditDocumentActions handle={handle} />
        <div className="flex flex-1 justify-center w-full items-start relative">
          <div className="editor-container flex flex-col w-0 flex-1 h-full relative">
            <ToolbarPlugin />
            <div className="p-6 md:p-8 w-full flex-1 self-stretch">
              <Skeleton className="h-8 w-1/4 mt-5 mb-6" />
              <Skeleton className="h-5 w-full mb-3" />
              <Skeleton className="h-5 w-11/12 mb-3" />
              <Skeleton className="h-5 w-10/12 mb-3" />
              <Skeleton className="h-5 w-9/12 mb-6" />
              <Skeleton className="h-6 w-1/3 mb-4" />
              <Skeleton className="h-5 w-full mb-3" />
              <Skeleton className="h-5 w-10/12 mb-3" />
              <Skeleton className="h-5 w-9/12 mb-3" />
            </div>
          </div>
          <DocumentSidebar handle={handle} />
        </div>
      </EditorComposer>
    </SidebarProvider>
  );
}
