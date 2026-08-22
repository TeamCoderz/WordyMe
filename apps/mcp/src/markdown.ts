/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import './dom-shim.js';
import {
  $getRoot,
  $isElementNode,
  createEditor,
  type ElementNode,
  type LexicalNode,
  type SerializedEditorState,
} from 'lexical';
import { $convertFromMarkdownString, $convertToMarkdownString } from '@lexical/markdown';
import { editorConfig } from '@repo/editor/config';
import { createTransformers } from '@repo/editor/plugins/MarkdownPlugin';
import { serializeEditorState } from '@repo/editor/utils/editorState';
import { getInitialEditorState } from '@repo/editor/utils/getInitialEditorState';

// Same headless pattern the app itself uses in @repo/editor/utils/generateText:
// a bare editor with the full node list, never attached to a DOM.
const editor = createEditor({ ...editorConfig });
const transformers = createTransformers(editor);

// Documents are wrapped in page nodes (page-setup, page → header/content/footer).
// Markdown lives inside the page-content nodes; the wrapper has no transformer.
function $findPageContents(): ElementNode[] {
  const found: ElementNode[] = [];
  const visit = (node: LexicalNode) => {
    if (!$isElementNode(node)) return;
    if (node.getType() === 'page-content') {
      found.push(node);
      return;
    }
    node.getChildren().forEach(visit);
  };
  visit($getRoot());
  return found;
}

export function toMarkdown(state: SerializedEditorState): string {
  editor.setEditorState(editor.parseEditorState(state));
  return editor.read(() => {
    const contents = $findPageContents();
    if (contents.length === 0) return $convertToMarkdownString(transformers);
    return contents.map((content) => $convertToMarkdownString(transformers, content)).join('\n\n');
  });
}

export function fromMarkdown(markdown: string): SerializedEditorState {
  // Start from the app's own new-document scaffold so the result is
  // structurally identical to a note created in the editor.
  editor.setEditorState(editor.parseEditorState(getInitialEditorState('')));
  editor.update(
    () => {
      const [content] = $findPageContents();
      $convertFromMarkdownString(markdown, transformers, content);
    },
    { discrete: true },
  );
  return serializeEditorState(editor.getEditorState()) as SerializedEditorState;
}
