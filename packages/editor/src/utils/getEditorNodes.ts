import { LexicalEditor, LexicalNode } from 'lexical';

export function getEditorNodes(editor: LexicalEditor): LexicalNode[] {
  return [...editor._editorState._nodeMap.values()];
}
