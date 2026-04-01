/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ImagesPlugin } from '@repo/editor/plugins/ImagePlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { cn } from '@repo/ui/lib/utils';
import AttachmentPlugin from '@repo/editor/plugins/AttachmentPlugin';
import PaginationPlugin from '@repo/editor/plugins/PaginationPlugin';
import MathPlugin from '@repo/editor/plugins/MathPlugin';
import { useCallback, useEffect } from 'react';
import { computeChecksum } from '@repo/editor/utils/computeChecksum';
import { useActions, useSelector } from '@repo/editor/store';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { serializeEditorState } from '@repo/editor/utils/editorState';
import SelectionHighlightPlugin from '@repo/editor/plugins/SelectionHighlightPlugin';
import { LinkNavigatePlugin } from '@repo/editor/plugins/LinkPlugin';

export const Viewer: React.FC<{ documentId?: string; tabId?: string; initialState?: string }> = ({
  documentId,
  tabId,
  initialState,
}) => {
  const [editor] = useLexicalComposerContext();
  const isPaged = useSelector((state) => state.pageSetup?.isPaged);
  const { updateEditorStoreState } = useActions();
  const updateChecksum = useCallback(
    (checksum: string) => {
      updateEditorStoreState('checksum', checksum);
      if (documentId) {
        const event = new CustomEvent('checksum-change', {
          detail: { documentId, tabId, checksum },
        });
        window.dispatchEvent(event);
      }
    },
    [documentId, tabId, updateEditorStoreState],
  );

  useEffect(() => {
    const editorState = editor.getEditorState();
    const serializedEditorState = serializeEditorState(editorState);
    const editorChecksum = computeChecksum(serializedEditorState);
    updateChecksum(editorChecksum);
    if (!initialState) return;
    const initialChecksum = computeChecksum(JSON.parse(initialState));
    if (editorChecksum !== initialChecksum) {
      const initialEditorState = editor.parseEditorState(initialState);
      editor.setEditorState(initialEditorState);
      updateChecksum(initialChecksum);
    }
  }, [editor, initialState, updateChecksum]);

  return (
    <div
      className={cn(
        'viewer-container @container flex flex-col w-0 flex-1 min-h-full relative text-base',
        {
          'scale-medium': isPaged,
        },
      )}
    >
      <RichTextPlugin
        contentEditable={
          <ContentEditable
            className="editor-input p-8 w-full flex-1 self-stretch"
            ariaLabel="editor input"
          />
        }
        ErrorBoundary={LexicalErrorBoundary}
      />
      <PaginationPlugin />
      <AttachmentPlugin />
      <ImagesPlugin />
      <MathPlugin />
      <SelectionHighlightPlugin />
      <LinkNavigatePlugin />
    </div>
  );
};

export default Viewer;
