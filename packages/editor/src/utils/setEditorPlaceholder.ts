/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { $isParagraphNode, $isRangeSelection, LexicalEditor, RangeSelection } from 'lexical';

export const setEditorPlaceholder = ({
  selection,
  editor,
}: {
  selection: RangeSelection;
  editor: LexicalEditor;
}): void => {
  const rootElement = editor.getRootElement();
  if (!rootElement) return;

  const placeholderElements = rootElement.querySelectorAll('[data-placeholder]');
  placeholderElements.forEach((element) => {
    element.removeAttribute('data-placeholder');
  });

  if ($isRangeSelection(selection)) {
    const topLevelElement = selection.anchor.getNode().getTopLevelElement();
    if (!$isParagraphNode(topLevelElement)) return;
    const placeholder = "Write something or type '/' for commands";
    const selectedHtmlElement = editor.getElementByKey(selection.anchor.key);
    selectedHtmlElement?.setAttribute('data-placeholder', placeholder);
  }
};
