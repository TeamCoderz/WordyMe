/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

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
import { useHotkey } from '@tanstack/react-hotkeys';
import { useDocumentActions } from './useDocumentActions';
import { DocumentSidebar } from './document-sidebar';
import { useSelector } from '@/store';

interface EditDocumentProps {
  userId: string;
  documentId: string;
  documentHandle: string;
  initialState?: string;
  tabId?: string;
}

export function EditDocument({
  userId,
  documentId,
  documentHandle,
  initialState,
  tabId,
}: EditDocumentProps) {
  const { mutateAsync: saveLocalRevision } = useSaveLocalRevisionMutation({
    documentId,
  });
  const isActiveTab = useSelector(
    (state) => state.tabs.activeTabId[state.tabs.activePane] === tabId,
  );
  const {
    handleUpdate,
    handleSaveAsNewRevision,
    handleSaveAndOverwrite,
    editorSettings,
    isDisabled,
    isPreviouslySaved,
  } = useDocumentActions(documentHandle, tabId);

  useHotkey('Mod+S', () => handleUpdate(false), { enabled: isActiveTab });
  useHotkey(
    'Mod+Shift+S',
    () => {
      if (isDisabled || isPreviouslySaved) return;
      if (editorSettings?.keepPreviousRevision && !editorSettings?.autosave) {
        handleSaveAndOverwrite();
      } else {
        handleSaveAsNewRevision();
      }
    },
    { enabled: isActiveTab, conflictBehavior: 'allow' },
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

  const services = useServices(documentId, userId);

  return (
    <EditorComposer
      key={documentId}
      services={services}
      initialState={initialState ?? null}
      editable={true}
      editorRef={editorRefCallback}
    >
      <DocumentSidebar handle={documentHandle}>
        <Editor documentId={documentId} onChange={onChange} tabId={tabId} />
      </DocumentSidebar>
    </EditorComposer>
  );
}
