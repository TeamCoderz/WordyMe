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
