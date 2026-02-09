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
import type { SerializedEditorState } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { serializeEditorState } from '@repo/editor/utils/editorState';
import SelectionHighlightPlugin from '@repo/editor/plugins/SelectionHighlightPlugin';
import { LinkNavigatePlugin } from '@repo/editor/plugins/LinkPlugin';

export const Viewer: React.FC = () => {
  const [editor] = useLexicalComposerContext();
  const isPaged = useSelector((state) => state.pageSetup?.isPaged);
  const { updateEditorStoreState } = useActions();
  const updateChecksum = useCallback(
    (serializedEditorState: SerializedEditorState) => {
      const checksum = computeChecksum(serializedEditorState);
      updateEditorStoreState('checksum', checksum);
      // Dispatch custom event with checksum
      const event = new CustomEvent('checksum-change', {
        detail: { checksum },
      });
      window.dispatchEvent(event);
    },
    [updateEditorStoreState],
  );

  useEffect(() => {
    const editorState = editor.getEditorState();
    const serializedEditorState = serializeEditorState(editorState);
    updateChecksum(serializedEditorState);
  }, [editor, updateChecksum]);

  return (
    <div
      className={cn('viewer-container flex flex-col w-0 flex-1 h-full relative text-base', {
        'scale-medium': isPaged,
      })}
    >
      <RichTextPlugin
        contentEditable={
          <ContentEditable
            className="editor-input p-6 md:p-8 w-full flex-1 self-stretch"
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
