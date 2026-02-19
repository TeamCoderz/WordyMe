/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CodeNode, $isCodeNode } from '@lexical/code';
import { CODE_LANGUAGE_FRIENDLY_NAME_MAP, CODE_LANGUAGE_MAP } from '@lexical/code';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useSelector, useActions } from '@repo/editor/store';
import { createPortal } from 'react-dom';
import {
  COMMAND_PRIORITY_LOW,
  $getNearestNodeFromDOMNode,
  $getSelection,
  $setSelection,
} from 'lexical';
import { mergeRegister } from '@lexical/utils';
import { UPDATE_CODE_LANGUAGE_COMMAND, COPY_CODE_COMMAND } from '@repo/editor/commands';
import { DropDown } from '@repo/editor/components/dropdown';
import { CopyIcon, CheckCircleIcon } from '@repo/ui/components/icons';
import { Button } from '@repo/ui/components/button';

const anchorPolyfill = async (elements: HTMLElement[]) => {
  if (!('anchorName' in document.documentElement.style)) {
    const { default: polyfill } = await import('@oddbird/css-anchor-positioning/fn');

    polyfill({
      elements,
      excludeInlineStyles: false,
      useAnimationFrame: false,
    });
  }
};

function getCodeLanguageOptions(): [string, string][] {
  const options: [string, string][] = [];

  for (const [lang, friendlyName] of Object.entries(CODE_LANGUAGE_FRIENDLY_NAME_MAP)) {
    options.push([lang, friendlyName]);
  }

  options.splice(3, 0, ['csharp', 'C#']);

  return options;
}

export const CODE_LANGUAGE_OPTIONS = getCodeLanguageOptions();

function CodeTools({ node }: { node: CodeNode }) {
  const [editor] = useLexicalComposerContext();
  const codeLanguage = useSelector((state) => state.codeLanguage);
  const { updateEditorStoreState } = useActions();

  const [isCopyCompleted, setCopyCompleted] = useState<boolean>(false);
  const codeToolbarRef = useRef<HTMLDivElement | null>(null);

  const $updateToolbar = useCallback(() => {
    if (node.isAttached()) {
      const language = node.getLanguage() as keyof typeof CODE_LANGUAGE_MAP;
      const languageName = language ? CODE_LANGUAGE_MAP[language] || language : '';
      updateEditorStoreState('codeLanguage', languageName);
    }
  }, [editor, node, updateEditorStoreState]);

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      editor.read(() => {
        $updateToolbar();
      });
    });
  }, [editor, $updateToolbar]);

  useEffect(() => {
    editor.getEditorState().read(() => {
      $updateToolbar();
    });
  }, [editor, $updateToolbar]);

  const onCodeLanguageSelect = useCallback(
    (value: string) => {
      editor.update(() => {
        node.setLanguage(value);
      });
    },
    [editor, node],
  );

  const handleCopyCode = useCallback(async () => {
    const codeElement = editor.getElementByKey(node.getKey());
    if (!codeElement) {
      return;
    }

    let content = '';

    editor.update(() => {
      const codeNode = $getNearestNodeFromDOMNode(codeElement);
      if ($isCodeNode(codeNode)) {
        content = codeNode.getTextContent();
      }
      const selection = $getSelection();
      $setSelection(selection);
    });

    try {
      await navigator.clipboard.writeText(content);
      setCopyCompleted(true);
      setTimeout(() => {
        setCopyCompleted(false);
      }, 1000);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  }, [editor, node]);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        UPDATE_CODE_LANGUAGE_COMMAND,
        (newLanguage) => {
          onCodeLanguageSelect(newLanguage);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        COPY_CODE_COMMAND,
        () => {
          handleCopyCode();
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, onCodeLanguageSelect, node]);

  useLayoutEffect(() => {
    const codeToolbarElem = codeToolbarRef.current;
    if (codeToolbarElem === null) return;
    const codeElement = editor.getElementByKey(node.getKey());
    if (codeElement === null) return;

    (codeElement.style as any).anchorName = `--code-anchor-${node.getKey()}`;
    codeToolbarElem.setAttribute(
      'style',
      `position-anchor: --code-anchor-${node.getKey()}; bottom: anchor(top); right: anchor(right); translate: -0.25rem calc(100% + 0.25rem)`,
    );

    anchorPolyfill([codeElement, codeToolbarElem]);
  }, [node, editor]);

  const dropdownOptions = CODE_LANGUAGE_OPTIONS.map(([option, text]) => ({
    label: text,
    value: option,
    func: () => onCodeLanguageSelect(option),
  }));

  return (
    <div
      ref={codeToolbarRef}
      className="code-toolbar flex absolute z-30 will-change-transform print:hidden gap-1"
    >
      <Button variant="outline" size="icon" onClick={handleCopyCode} aria-label="Copy code">
        {isCopyCompleted ? <CheckCircleIcon className="text-green-600" /> : <CopyIcon />}
      </Button>
      <DropDown
        label={
          dropdownOptions.find((option) => option.value === codeLanguage)?.label ||
          'Select Language'
        }
        value={codeLanguage}
        options={dropdownOptions}
        onClose={() => {}}
      />
    </div>
  );
}

export default function CodeToolbar({
  node,
  anchorElem = document.querySelector('.editor-container') as HTMLElement,
}: {
  node: CodeNode;
  anchorElem?: HTMLElement;
}) {
  return createPortal(<CodeTools node={node} />, anchorElem);
}
