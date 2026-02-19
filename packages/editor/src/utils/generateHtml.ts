/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { createEditor, type InitialEditorStateType } from 'lexical';
import { editorConfig } from '@repo/editor/config';
import { $generateHtmlFromNodes } from '@lexical/html';

const editor = createEditor({ ...editorConfig, editable: false });

export const generateHtml = (editorState: InitialEditorStateType) => {
  try {
    if (!editorState) return '';
    switch (typeof editorState) {
      case 'string': {
        const parsedEditorState = editor.parseEditorState(editorState);
        editor.setEditorState(parsedEditorState);
        break;
      }
      case 'object': {
        editor.setEditorState(editorState);
        break;
      }
      case 'function': {
        editor.update(
          () => {
            editorState(editor);
          },
          { discrete: true },
        );
        break;
      }
    }
    const html = editor.getEditorState().read(() => {
      return $generateHtmlFromNodes(editor);
    });
    return html;
  } catch (error) {
    console.error('Error generating HTML:', error);
    return '';
  }
};
