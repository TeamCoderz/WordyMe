/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';
import {
  CLEAR_HISTORY_COMMAND,
  SerializedEditorState,
  type EditorState,
  type LexicalEditor,
} from 'lexical';
import ToolbarPlugin from '@repo/editor/plugins/ToolbarPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { TablePlugin, TableCellResizerPlugin } from '@repo/editor/plugins/TablePlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import ListMaxIndentLevelPlugin from '@repo/editor/plugins/ListPlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { MarkdownShortcutPlugin } from '@repo/editor/plugins/MarkdownPlugin';
import CodeHighlightPlugin from '@repo/editor/plugins/CodePlugin';
import { AutoLinkPlugin } from '@repo/editor/plugins/LinkPlugin';
import { HorizontalRulePlugin } from '@repo/editor/plugins/HorizontalRulePlugin';
import MathPlugin from '@repo/editor/plugins/MathPlugin';
import { ImagesPlugin, ImageResizerPlugin } from '@repo/editor/plugins/ImagePlugin';
import SketchPlugin from '@repo/editor/plugins/SketchPlugin';
import DiagramPlugin from '@repo/editor/plugins/DiagramPlugin';
import ScorePlugin from '@repo/editor/plugins/ScorePlugin';
import StickyPlugin from '@repo/editor/plugins/StickyPlugin';
import ComponentPickerMenuPlugin from '@repo/editor/plugins/ComponentPickerPlugin';
import TabFocusPlugin from '@repo/editor/plugins/TabFocusPlugin';
import DragDropPaste from '@repo/editor/plugins/DragDropPastePlugin';
import IFramePlugin from '@repo/editor/plugins/IFramePlugin';
import { LayoutPlugin } from '@repo/editor/plugins/LayoutPlugin';
import DetailsPlugin from '@repo/editor/plugins/DetailsPlugin';
import AlertPlugin from '@repo/editor/plugins/AlertPlugin';
import ContextMenuPlugin from '@repo/editor/plugins/ContextMenuPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { cn } from '@repo/ui/lib/utils';
import AutoEmbedPlugin from '@repo/editor/plugins/AutoEmbedPlugin';
import AttachmentPlugin from '@repo/editor/plugins/AttachmentPlugin';
import PaginationPlugin from '@repo/editor/plugins/PaginationPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import ShortcutsPlugin from '@repo/editor/plugins/ShortcutsPlugin';
import FloatingToolbarPlugin from '@repo/editor/plugins/FloatingToolbar';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useActions, useSelector } from '@repo/editor/store';
import { useCallback, useEffect } from 'react';
import { computeChecksum } from '@repo/editor/utils/computeChecksum';
import { serializeEditorState } from '@repo/editor/utils/editorState';
import SelectionHighlightPlugin from '@repo/editor/plugins/SelectionHighlightPlugin';

export const Editor: React.FC<{
  onChange?: (editorState: EditorState, editor: LexicalEditor, tags: Set<string>) => void;
}> = ({ onChange }) => {
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

  const onChangeHandler = useCallback(
    (editorState: EditorState, editor: LexicalEditor, tags: Set<string>) => {
      if (tags.has('revision')) {
        editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
        return;
      }
      const serializedEditorState = serializeEditorState(editorState);
      updateChecksum(serializedEditorState);
      onChange?.(editorState, editor, tags);
    },
    [onChange, updateChecksum],
  );

  return (
    <div
      className={cn('editor-container flex flex-col w-0 flex-1 h-full relative text-base', {
        'scale-medium': isPaged,
      })}
    >
      <ToolbarPlugin />
      <RichTextPlugin
        contentEditable={
          <ContextMenuPlugin>
            <ContentEditable
              className="editor-input p-6 md:p-8 w-full flex-1 self-stretch"
              ariaLabel="editor input"
            />
          </ContextMenuPlugin>
        }
        ErrorBoundary={LexicalErrorBoundary}
      />
      <PaginationPlugin />
      <HistoryPlugin />
      <OnChangePlugin
        onChange={onChangeHandler}
        ignoreHistoryMergeTagChange={true}
        ignoreSelectionChange={true}
      />
      <ListPlugin />
      <CheckListPlugin />
      <LinkPlugin />
      <TabFocusPlugin />
      <TabIndentationPlugin />
      <ListMaxIndentLevelPlugin maxDepth={7} />
      <MarkdownShortcutPlugin />
      <HorizontalRulePlugin />
      <ComponentPickerMenuPlugin />
      <MathPlugin />
      <DragDropPaste />
      <CodeHighlightPlugin />
      <AutoLinkPlugin />
      <AlertPlugin />
      <TablePlugin />
      <TableCellResizerPlugin />
      <ImagesPlugin />
      <SketchPlugin />
      <DiagramPlugin />
      <ScorePlugin />
      <StickyPlugin />
      <SelectionHighlightPlugin />
      <IFramePlugin />
      <LayoutPlugin />
      <DetailsPlugin />
      <AutoEmbedPlugin />
      <AttachmentPlugin />
      <ImageResizerPlugin />
      <ShortcutsPlugin editor={editor} />
      <FloatingToolbarPlugin />
    </div>
  );
};

export default Editor;
