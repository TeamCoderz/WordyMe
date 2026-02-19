/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { LexicalEditor, LexicalNode } from 'lexical';

export function getEditorNodes(editor: LexicalEditor): LexicalNode[] {
  return [...editor._editorState._nodeMap.values()];
}
