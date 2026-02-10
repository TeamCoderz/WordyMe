/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { HeadingTagType } from '@lexical/rich-text';
import {
  COMMAND_PRIORITY_NORMAL,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  isModifierMatch,
  KEY_DOWN_COMMAND,
  LexicalEditor,
  OUTDENT_CONTENT_COMMAND,
} from 'lexical';
import { useEffect } from 'react';

import { useSelector, useActions } from '@repo/editor/store';
// import { INSERT_INLINE_COMMAND } from ".@repo/editor/commentPlugin";
import {
  clearFormatting,
  formatBulletList,
  formatCheckList,
  formatCode,
  formatHeading,
  formatNumberedList,
  formatParagraph,
  formatQuote,
  updateFontSize,
  UpdateFontSizeType,
} from '@repo/editor/utils/toolbarUtils';
import {
  // isAddComment,
  isCapitalize,
  isCenterAlign,
  isClearFormatting,
  isDecreaseFontSize,
  isFormatBulletList,
  isFormatCheckList,
  isFormatCode,
  isFormatHeading,
  isFormatNumberedList,
  isFormatParagraph,
  isFormatQuote,
  isIncreaseFontSize,
  isIndent,
  isInsertCodeBlock,
  isInsertLink,
  isJustifyAlign,
  isLeftAlign,
  isLowercase,
  isOutdent,
  isRightAlign,
  isStrikeThrough,
  isSubscript,
  isSuperscript,
  isUppercase,
  isCode,
  isHighlight,
  isBold,
} from './utils';

export * from './shortcuts';

export default function ShortcutsPlugin({ editor }: { editor: LexicalEditor }): null {
  const { updateEditorStoreState } = useActions();
  const blockType = useSelector((state) => state.blockType);
  const fontSizeInputValue = useSelector((state) => state.fontSizeInputValue);
  const isLink = useSelector((state) => state.isLink);
  useEffect(() => {
    const keyboardShortcutsHandler = (event: KeyboardEvent) => {
      // Short-circuit, a least one modifier must be set
      if (isModifierMatch(event, {})) {
        return false;
      } else if (isFormatParagraph(event)) {
        formatParagraph(editor);
      } else if (isFormatHeading(event)) {
        const { code } = event;
        const headingSize = `h${code[code.length - 1]}` as HeadingTagType;
        formatHeading(editor, blockType, headingSize);
      } else if (isFormatBulletList(event)) {
        formatBulletList(editor, blockType);
      } else if (isFormatNumberedList(event)) {
        formatNumberedList(editor, blockType);
      } else if (isFormatCheckList(event)) {
        formatCheckList(editor, blockType);
      } else if (isFormatCode(event)) {
        formatCode(editor, blockType);
      } else if (isFormatQuote(event)) {
        formatQuote(editor, blockType);
      } else if (isBold(event)) {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
      } else if (isStrikeThrough(event)) {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
      } else if (isLowercase(event)) {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'lowercase');
      } else if (isUppercase(event)) {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'uppercase');
      } else if (isCapitalize(event)) {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'capitalize');
      } else if (isIndent(event)) {
        editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
      } else if (isOutdent(event)) {
        editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
      } else if (isCenterAlign(event)) {
        editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
      } else if (isLeftAlign(event)) {
        editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
      } else if (isRightAlign(event)) {
        editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
      } else if (isJustifyAlign(event)) {
        editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
      } else if (isSubscript(event)) {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'subscript');
      } else if (isSuperscript(event)) {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'superscript');
      } else if (isInsertCodeBlock(event)) {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code');
      } else if (isIncreaseFontSize(event)) {
        updateFontSize(editor, UpdateFontSizeType.increment, fontSizeInputValue);
      } else if (isDecreaseFontSize(event)) {
        updateFontSize(editor, UpdateFontSizeType.decrement, fontSizeInputValue);
      } else if (isClearFormatting(event)) {
        clearFormatting(editor);
      } else if (isInsertLink(event)) {
        updateEditorStoreState('openDialog', 'link');
      } else if (isCode(event)) {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code');
      } else if (isHighlight(event)) {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'highlight');
        // } else if (isAddComment(event)) {
        //   editor.dispatchCommand(INSERT_INLINE_COMMAND, undefined);
      } else {
        // No match for any of the event handlers
        return false;
      }
      event.preventDefault();
      return true;
    };

    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      keyboardShortcutsHandler,
      COMMAND_PRIORITY_NORMAL,
    );
  }, [editor, isLink, blockType, fontSizeInputValue]);

  return null;
}
