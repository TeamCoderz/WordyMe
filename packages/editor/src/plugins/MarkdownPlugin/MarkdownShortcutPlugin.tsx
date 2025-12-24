/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { useEffect, useMemo, type JSX } from 'react';

import { MarkdownShortcutPlugin as LexicalMarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';

import { createTransformers } from './MarkdownTransformers';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  PASTE_COMMAND,
  $getSelection,
  $createParagraphNode,
  $isRangeSelection,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  $addUpdateTag,
  PASTE_TAG,
} from 'lexical';
import { $convertFromMarkdownString } from '.';

export function MarkdownShortcutPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const transformers = useMemo(() => createTransformers(editor), [editor]);

  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent) => {
        if (!event.clipboardData) return false;
        const html = event.clipboardData.getData('text/html');
        if (html) return false;
        const text = event.clipboardData.getData('text/plain');
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;
        const parent = $createParagraphNode();
        $setSelection(null);
        $convertFromMarkdownString(text, transformers, parent);
        const children = parent.getChildren();
        selection.insertNodes(children);
        $addUpdateTag(PASTE_TAG);
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  return <LexicalMarkdownShortcutPlugin transformers={transformers} />;
}
