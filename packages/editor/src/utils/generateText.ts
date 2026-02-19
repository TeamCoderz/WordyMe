/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { SerializedEditorState } from 'lexical';
import { editorConfig } from '@repo/editor/config';
import { $getRoot, createEditor } from 'lexical';

const editor = createEditor({ ...editorConfig, editable: false });

export const generateText = (data: SerializedEditorState) => {
  try {
    const editorState = editor.parseEditorState(data);
    editor.setEditorState(editorState);
    const text = editorState.read(() => {
      const root = $getRoot();
      return root.getTextContent();
    });
    return text;
  } catch (error) {
    console.error('Error generating Text:', error);
    return '';
  }
};
