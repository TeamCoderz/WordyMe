import { LexicalEditor } from 'lexical';
import { useEffect, useRef, useState } from 'react';

export type LexicalKey = `__lexicalKey_${string}`;

export interface LexicalHTMLElement extends HTMLElement {
  [key: LexicalKey]: string;
  __lexicalEditor: LexicalEditor;
}

export function useNearestEditor(element: HTMLElement) {
  const [editor, setEditor] = useState(() => {
    const contentEditable =
      element.querySelector<LexicalHTMLElement>("[data-lexical-editor='true']") ||
      element.closest<LexicalHTMLElement>("[data-lexical-editor='true']");
    return contentEditable?.__lexicalEditor;
  });
  const editorKeyRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const updateNearestEditor = () => {
      const contentEditable =
        element.querySelector<LexicalHTMLElement>("[data-lexical-editor='true']") ||
        element.closest<LexicalHTMLElement>("[data-lexical-editor='true']");
      const currentEditorKey = contentEditable?.__lexicalEditor._key;
      if (currentEditorKey !== editorKeyRef.current) {
        setEditor(contentEditable?.__lexicalEditor);
        editorKeyRef.current = currentEditorKey;
      }
    };

    // Initial sync in case the DOM changed between render and effect
    updateNearestEditor();

    const observer = new MutationObserver(() => {
      updateNearestEditor();
    });

    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      editorKeyRef.current = undefined;
      setEditor(undefined);
    };
  }, [element]);

  return editor;
}
