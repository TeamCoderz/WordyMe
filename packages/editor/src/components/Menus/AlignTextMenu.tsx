'use client';
import {
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  FORMAT_ELEMENT_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import { useCallback, useEffect } from 'react';
import { getSelectedNode } from '@repo/editor/utils/getSelectedNode';
import { mergeRegister, $findMatchingParent } from '@lexical/utils';
import { DropDown } from '@repo/editor/components/dropdown';
import { TextAlignIcon } from '@repo/editor/components/icons';
import { IndentIcon, OutdentIcon } from '@repo/ui/components/icons';
import { restoreFocus } from '@repo/editor/utils/restoreFocus';
import { SHORTCUTS } from '@repo/editor/plugins/ShortcutsPlugin';
import { useSelector, useActions } from '@repo/editor/store';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

export default function AlignTextMenu() {
  const [editor] = useLexicalComposerContext();
  const formatType = useSelector((state) => state.elementFormat);
  const indentationLevel = useSelector((state) => state.indentationLevel);
  const isRTL = useSelector((state) => state.isRTL);
  const { updateEditorStoreState } = useActions();
  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (!selection) return;
    const element = $findMatchingParent(
      $isRangeSelection(selection) ? getSelectedNode(selection) : selection.getNodes()[0],
      $isElementNode,
    );
    if (!element) return;
    updateEditorStoreState('elementFormat', element.getFormatType() || 'left');
    updateEditorStoreState('indentationLevel', element.getIndent() || 0);
  }, [editor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          $updateToolbar();
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateToolbar();
        });
      }),
    );
  }, [editor, $updateToolbar]);

  const alignOptions = [
    {
      icon: <TextAlignIcon formatType="left" />,
      label: 'Left Align',
      value: 'left',
      shortcut: SHORTCUTS.LEFT_ALIGN,
      isSelected: formatType === 'left',
      func: () => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left'),
    },
    {
      icon: <TextAlignIcon formatType="center" />,
      label: 'Center Align',
      value: 'center',
      shortcut: SHORTCUTS.CENTER_ALIGN,
      isSelected: formatType === 'center',
      func: () => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center'),
    },
    {
      icon: <TextAlignIcon formatType="right" />,
      label: 'Right Align',
      value: 'right',
      shortcut: SHORTCUTS.RIGHT_ALIGN,
      isSelected: formatType === 'right',
      func: () => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right'),
    },
    {
      icon: <TextAlignIcon formatType="justify" />,
      label: 'Justify Align',
      value: 'justify',
      shortcut: SHORTCUTS.JUSTIFY_ALIGN,
      isSelected: formatType === 'justify',
      func: () => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify'),
    },
    {
      separator: true,
      label: 'separator',
      value: 'separator',
    },
    {
      icon: isRTL ? <OutdentIcon /> : <IndentIcon />,
      label: 'Indent',
      value: 'indent',
      shortcut: SHORTCUTS.INDENT,
      func: () => editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined),
    },
    {
      icon: isRTL ? <IndentIcon /> : <OutdentIcon />,
      label: 'Outdent',
      value: 'outdent',
      shortcut: SHORTCUTS.OUTDENT,
      disabled: indentationLevel === 0,
      func: () => editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined),
    },
  ];

  return (
    <DropDown
      label={<TextAlignIcon formatType={formatType} />}
      value={formatType}
      options={alignOptions}
      triggerVariant="outline"
      showChevrons={false}
      onClose={() => restoreFocus(editor)}
    />
  );
}
