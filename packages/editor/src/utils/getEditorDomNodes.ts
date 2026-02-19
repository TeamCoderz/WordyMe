/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { $getNodeByKey, $getRoot, LexicalEditor } from 'lexical';

export const getEditorDomNodes = (editor: LexicalEditor) => {
  const childrenKeys = editor.getEditorState().read(() => $getRoot().getChildrenKeys());

  return childrenKeys.map((key) => ({
    key: key,
    node: $getNodeByKey(key),
    htmlElement: editor.getElementByKey(key),
  }));
};
