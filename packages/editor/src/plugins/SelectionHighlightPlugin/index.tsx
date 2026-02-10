'use client';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';

export default function MathPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const handleSelectionChange = () => {
      const domSelection = document.getSelection();
      if (!domSelection) return false;
      const rootElement = editor.getRootElement();
      if (!rootElement) return false;
      const elements = rootElement.querySelectorAll(
        '.LexicalTheme__attachment,.LexicalTheme__image,.LexicalTheme__math,.LexicalTheme__tableCell,.LexicalTheme__sticky,.LexicalTheme__alert,.LexicalTheme__details',
      );
      elements.forEach((element) => {
        const isSelected = domSelection.containsNode(element);
        element.classList.toggle('selected', isSelected);
      });
      return false;
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  return null;
}
