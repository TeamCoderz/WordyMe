/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { $isMathNode } from '@repo/editor/nodes/MathNode';
import { $patchStyle } from '@repo/editor/utils/nodeUtils';
import { $getSelectionStyleValueForProperty, $patchStyleText } from '@lexical/selection';
import {
  $addUpdateTag,
  $getPreviousSelection,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_LOW,
  HISTORIC_TAG,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import { useCallback, useEffect, useRef } from 'react';
import { mergeRegister } from '@lexical/utils';
import { FontSizeSelect } from './FontSizeSelect';
import { DropDown } from '@repo/editor/components/dropdown';
import { restoreFocus } from '@repo/editor/utils/restoreFocus';
import { fontFamilyToFriendlyName, useActions, useSelector } from '@repo/editor/store';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { SET_FONT_FAMILY_COMMAND } from '@repo/editor/commands';

export default function FontSelect() {
  const [editor] = useLexicalComposerContext();
  const fontFamily = useSelector((state) => state.fontFamily);
  const blockType = useSelector((state) => state.blockType);
  const { updateEditorStoreState } = useActions();
  const shouldSkipHistoryPushRef = useRef(false);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    const domSelection = window.getSelection();
    if (!domSelection) return false;
    const focusNode = domSelection.focusNode;
    if (!focusNode) return false;
    const isTextNode = focusNode.nodeType === Node.TEXT_NODE;
    const domElement = isTextNode ? focusNode.parentElement : (focusNode as HTMLElement);
    if (!domElement) return false;
    const computedStyle = window.getComputedStyle(domElement);
    const currentFontSize = computedStyle.getPropertyValue('font-size');
    const currentFontFamily = computedStyle
      .getPropertyValue('font-family')
      .split(',')[0]
      .trim()
      .replace(/['"]+/g, '');
    if ($isRangeSelection(selection)) {
      const nextFontSize = $getSelectionStyleValueForProperty(selection, 'font-size');
      const nextFontFamily = $getSelectionStyleValueForProperty(selection, 'font-family');
      updateEditorStoreState('fontSize', nextFontSize);
      updateEditorStoreState('fontFamily', nextFontFamily);
      if (!nextFontSize) updateEditorStoreState('fontSize', currentFontSize);
      if (!nextFontFamily) updateEditorStoreState('fontFamily', currentFontFamily);
    } else {
      updateEditorStoreState('fontSize', currentFontSize);
      updateEditorStoreState('fontFamily', currentFontFamily);
    }
    return false;
  }, [editor, updateEditorStoreState]);

  const applyStyleText = useCallback(
    (styles: Record<string, string>) => {
      editor.update(
        () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $patchStyleText(selection, styles);
            const mathNodes = selection.getNodes().filter($isMathNode);
            $patchStyle(mathNodes, styles);
            if (shouldSkipHistoryPushRef.current) {
              $addUpdateTag(HISTORIC_TAG);
            }
            shouldSkipHistoryPushRef.current = true;
          }
        },
        { discrete: true },
      );
    },
    [editor],
  );

  const updateFontFamily = useCallback(
    (value: string) => {
      updateEditorStoreState('fontFamily', value);
      applyStyleText({ 'font-family': value });
    },
    [updateEditorStoreState, applyStyleText],
  );

  const onFontFamilySelect = useCallback(
    (value: string) => {
      if (!value) return;
      updateFontFamily(value);
    },
    [updateFontFamily],
  );

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar();
          const selection = $getSelection();
          const previousSelection = $getPreviousSelection();
          const isSameSelection =
            $isRangeSelection(selection) &&
            $isRangeSelection(previousSelection) &&
            selection.anchor.key === previousSelection.anchor.key &&
            selection.anchor.offset === previousSelection.anchor.offset &&
            selection.focus.key === previousSelection.focus.key &&
            selection.focus.offset === previousSelection.focus.offset;
          shouldSkipHistoryPushRef.current &&= isSameSelection;
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        SET_FONT_FAMILY_COMMAND,
        (nextFontFamily) => {
          updateFontFamily(nextFontFamily);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
    );
  }, [editor, updateFontFamily, updateToolbar]);

  const fontFamilyOptions = Object.entries(fontFamilyToFriendlyName).map(([option, text]) => ({
    value: option,
    label: text,
    style: { fontFamily: option },
    icon: <span style={{ fontFamily: option }}>Aa</span>,
    func: () => onFontFamilySelect(option),
  }));

  if (!Object.hasOwn(fontFamilyToFriendlyName, fontFamily)) {
    fontFamilyOptions.push({
      value: fontFamily,
      label: fontFamily,
      style: { fontFamily: fontFamily },
      icon: <span style={{ fontFamily: fontFamily }}>Aa</span>,
      func: () => onFontFamilySelect(fontFamily),
    });
  }

  const currentFontFamily = fontFamilyOptions.find((option) => option.value === fontFamily);

  const handleClose = useCallback(() => {
    shouldSkipHistoryPushRef.current = false;
    restoreFocus(editor);
  }, [editor]);

  return (
    <div className="flex gap-2">
      <DropDown
        label={
          <span className="flex items-center gap-1 md:gap-2">
            <span style={{ fontFamily }}>Aa</span>
            <span className="menuitem-text">{currentFontFamily?.label}</span>
          </span>
        }
        className="[&_.menuitem-text]:hidden [&_.menuitem-text]:sm:block"
        contentClassName="w-50"
        value={fontFamily}
        options={fontFamilyOptions}
        onClose={handleClose}
        disabled={blockType === 'code'}
      />
      <FontSizeSelect onBlur={handleClose} disabled={blockType === 'code'} />
    </div>
  );
}
