/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';
import {
  $createParagraphNode,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  $isRootNode,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  LexicalCommand,
} from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical';
import { useEffect } from 'react';
import { $wrapNodeInElement, mergeRegister } from '@lexical/utils';
import { $createMathNode, MathNode } from '@repo/editor/nodes/MathNode';
import { NAVIGATION_BLOCKED_EVENT, setShouldBlockNavigation } from '@repo/shared/navigation';

type CommandPayload = {
  value: string;
};

export const INSERT_MATH_COMMAND: LexicalCommand<CommandPayload> = createCommand();

export default function MathPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([MathNode])) {
      throw new Error('MathPlugin: MathNode not registered on editor');
    }

    return mergeRegister(
      editor.registerCommand<CommandPayload>(
        INSERT_MATH_COMMAND,
        (payload) => {
          const { value } = payload;
          const selection = $getSelection();
          const style = $isRangeSelection(selection) ? selection.style : '';
          const mathNode = $createMathNode(value, style);
          $insertNodes([mathNode]);
          if ($isRootNode(mathNode.getParentOrThrow())) {
            $wrapNodeInElement(mathNode, $createParagraphNode);
          }
          setTimeout(() => {
            editor.update(() => {
              mathNode.select();
            });
          }, 0);
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      // workaround for arrow up and arrow down key events
      editor.registerCommand<KeyboardEvent>(
        KEY_ARROW_UP_COMMAND,
        () => {
          const rootElement = editor.getRootElement();
          if (!rootElement) return false;
          const mathfields = rootElement.querySelectorAll('math-field');
          mathfields.forEach((mathfield) => {
            const keyboardSink = mathfield.shadowRoot?.querySelector('[part="keyboard-sink"]');
            keyboardSink?.removeAttribute('contenteditable');
            setTimeout(() => {
              keyboardSink?.setAttribute('contenteditable', 'true');
            }, 0);
          });
          return false;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand<KeyboardEvent>(
        KEY_ARROW_DOWN_COMMAND,
        () => {
          const rootElement = editor.getRootElement();
          if (!rootElement) return false;
          const mathfields = rootElement.querySelectorAll('math-field');
          mathfields.forEach((mathfield) => {
            const keyboardSink = mathfield.shadowRoot?.querySelector('[part="keyboard-sink"]');
            keyboardSink?.removeAttribute('contenteditable');
            setTimeout(() => {
              keyboardSink?.setAttribute('contenteditable', 'true');
            }, 0);
          });
          return false;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    );
  }, [editor]);

  useEffect(() => {
    const handleOpenChange = () => {
      const mathVirtualKeyboard = window.mathVirtualKeyboard;
      setShouldBlockNavigation(mathVirtualKeyboard.visible);
    };
    window.mathVirtualKeyboard.addEventListener('geometrychange', handleOpenChange);
    const handleNavigationBlocked = () => {
      const mathVirtualKeyboard = window.mathVirtualKeyboard;
      if (!mathVirtualKeyboard.visible) return;
      const activeElement = document.activeElement as HTMLElement | null;
      if (activeElement?.tagName !== 'MATH-FIELD') return;
      activeElement.blur();
    };
    window.addEventListener(NAVIGATION_BLOCKED_EVENT, handleNavigationBlocked);
    return () => {
      window.mathVirtualKeyboard.removeEventListener('geometrychange', handleOpenChange);
      window.removeEventListener(NAVIGATION_BLOCKED_EVENT, handleNavigationBlocked);
    };
  }, []);

  return null;
}
