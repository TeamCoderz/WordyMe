/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { LexicalEditor, $getSelection, $getPreviousSelection, $setSelection } from 'lexical';

export const restoreFocus = (editor: LexicalEditor) => {
  editor.update(
    () => {
      const selection = $getSelection() || $getPreviousSelection();
      if (!selection) return;
      $setSelection(selection.clone());
    },
    {
      onUpdate() {
        editor.focus(undefined, { defaultSelection: 'rootStart' });
      },
    },
  );
};
