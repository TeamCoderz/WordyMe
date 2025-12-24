'use client';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { editorConfig } from '@repo/editor/config';
import { EditorStoreProvider, Services } from '@repo/editor/store';
import type { InitialEditorStateType } from 'lexical';
import { EditorRefPlugin } from '@lexical/react/LexicalEditorRefPlugin';

export const EditorComposer: React.FC<
  React.PropsWithChildren<{
    initialState?: InitialEditorStateType;
    editable: boolean;
    services: Services;
    editorRef?: React.ComponentProps<typeof EditorRefPlugin>['editorRef'];
  }>
> = ({ initialState, services, editorRef, children, editable }) => {
  return (
    <LexicalComposer
      initialConfig={{
        ...editorConfig,
        editorState: initialState,
        editable: editable,
      }}
    >
      <EditorStoreProvider services={services}>
        {children}
        {editorRef && <EditorRefPlugin editorRef={editorRef} />}
      </EditorStoreProvider>
    </LexicalComposer>
  );
};

export default EditorComposer;
