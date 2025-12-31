import type { Document } from '@repo/types/documents';
import EditDocumentActions from './edit-document-actions';
import type { User } from '@repo/types/user';
import { useCallback, useMemo, useState } from 'react';
import { SidebarProvider } from '@repo/ui/components/sidebar';
import { useMediaQuery } from '@repo/ui/hooks/use-media-query';
import { cn } from '@repo/ui/lib/utils';
import { DocumentSidebar } from './document-sidebar';
import { EditorComposer } from '@repo/editor/EditorComposer';
import { Editor } from '@repo/editor/Editor';
import type { EditorState, LexicalEditor } from '@repo/editor/types';
import { ANNOUNCE_COMMAND, ALERT_COMMAND, COMMAND_PRIORITY_LOW } from '@repo/editor/commands';
import { mergeRegister } from '@repo/editor/utils';
import { toast } from 'sonner';
import { alert } from '../Layout/alert';
import { getServices } from './services';
import { useSaveLocalRevisionMutation } from '@/queries/revisions';
import { useDebouncedCallback } from '@repo/ui/hooks/use-debounce';
interface EditDocumentProps {
  user: User;
  document: Document;
  initialState?: string;
}

export function EditDocument({ document, initialState }: EditDocumentProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [openDesktop, setOpenDesktop] = useState(true);
  const [openMobile, setOpenMobile] = useState(false);
  const { mutateAsync: saveLocalRevision } = useSaveLocalRevisionMutation({
    documentId: document.id,
  });
  const toggleSidebar = useCallback(
    (open: boolean) => {
      return isDesktop ? setOpenDesktop(open) : setOpenMobile(open);
    },
    [isDesktop, setOpenDesktop, setOpenMobile],
  );

  const editorRefCallback = (editor: LexicalEditor) => {
    return mergeRegister(
      editor.registerCommand(
        ANNOUNCE_COMMAND,
        (payload) => {
          const data = {
            id: payload.id,
            description: payload.message?.subtitle,
            action: payload.action,
            duration: payload.timeout,
          };
          switch (payload.type) {
            case 'loading':
              toast.loading(payload.message.title, data);
              break;
            case 'success':
              toast.success(payload.message.title, data);
              break;
            case 'error':
              toast.error(payload.message.title, data);
              break;
            case 'warning':
              toast.warning(payload.message.title, data);
              break;
            case 'info':
              toast.info(payload.message.title, data);
              break;
            default:
              toast(payload.message.title, data);
              break;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        ALERT_COMMAND,
        (payload) => {
          alert(payload);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  };

  const onChange = useDebouncedCallback((editorState: EditorState) => {
    saveLocalRevision({ editorState });
  }, 300);

  const services = useMemo(() => getServices(document.id), [document.id]);
  console.log(services);

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
        services={services}
        initialState={initialState ?? null}
        editable={true}
        editorRef={editorRefCallback}
      >
        <EditDocumentActions handle={document.handle} />
        <div className="flex flex-1 justify-center w-full h-full items-start relative">
          <Editor onChange={onChange} />
          <DocumentSidebar handle={document.handle} />
        </div>
      </EditorComposer>
    </SidebarProvider>
  );
}
