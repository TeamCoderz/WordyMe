/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { Document } from '@repo/types/documents';
import type { User } from '@repo/types/user';
import { EditorComposer } from '@repo/editor/EditorComposer';
import { Editor } from '@repo/editor/Editor';
import type { EditorState, LexicalEditor } from '@repo/editor/types';
import { ANNOUNCE_COMMAND, ALERT_COMMAND, COMMAND_PRIORITY_LOW } from '@repo/editor/commands';
import { mergeRegister } from '@repo/editor/utils';
import { toast } from 'sonner';
import { alert } from '../Layout/alert';
import { useServices } from './useServices';
import { useSaveLocalRevisionMutation } from '@/queries/revisions';
import { useDebouncedCallback } from '@repo/ui/hooks/use-debounce';
import { serializeEditorState } from '@repo/editor/utils/editorState';
import { useDocumentActions } from './useDocumentActions';
import { DocumentSidebar } from './document-sidebar';

interface EditDocumentProps {
  user: User;
  document: Document;
  initialState?: string;
}

export function EditDocument({ document, user, initialState }: EditDocumentProps) {
  const { mutateAsync: saveLocalRevision } = useSaveLocalRevisionMutation({
    documentId: document.id,
  });
  const { handleUpdate, editorSettings } = useDocumentActions(document.handle);

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

  const handleAutosave = useDebouncedCallback(() => {
    handleUpdate(true);
  }, 3000);

  const onChange = useDebouncedCallback((editorState: EditorState) => {
    saveLocalRevision({
      serializedEditorState: serializeEditorState(editorState),
    });
    if (editorSettings?.autosave) {
      handleAutosave();
    }
  }, 300);

  const services = useServices(document.id, user.id);

  return (
    <EditorComposer
      key={document.id}
      services={services}
      initialState={initialState ?? null}
      editable={true}
      editorRef={editorRefCallback}
    >
      <DocumentSidebar handle={document.handle}>
        <Editor documentId={document.id} onChange={onChange} />
      </DocumentSidebar>
    </EditorComposer>
  );
}
