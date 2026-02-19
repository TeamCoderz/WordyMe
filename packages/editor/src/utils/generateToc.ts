/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  $getRoot,
  $isElementNode,
  createEditor,
  ElementNode,
  NodeKey,
  type SerializedEditorState,
} from 'lexical';
import { editorConfig } from '@repo/editor/config';
import { $isHeadingNode } from '@repo/editor/nodes/HeadingNode';
import { HeadingTagType } from '@lexical/rich-text';
import { formatId } from '@repo/lib/utils/id';

export type TableOfContentsEntry = [key: NodeKey, text: string, tag: HeadingTagType, id: string];

const editor = createEditor({ ...editorConfig, editable: false });

export const generateToc = (data?: SerializedEditorState) => {
  if (!data) return [];
  try {
    const editorState = editor.parseEditorState(data);
    editor.setEditorState(editorState);
    const currentTableOfContents: Array<TableOfContentsEntry> = [];
    editor.getEditorState().read(() => {
      const updateCurrentTableOfContents = (node: ElementNode) => {
        for (const child of node.getChildren()) {
          if ($isHeadingNode(child)) {
            currentTableOfContents.push([
              child.getKey(),
              child.getTextContent(),
              child.getTag(),
              child.getId() || formatId(child.getTextContent()),
            ]);
          } else if ($isElementNode(child)) {
            updateCurrentTableOfContents(child);
          }
        }
      };

      updateCurrentTableOfContents($getRoot());
    });
    return currentTableOfContents;
  } catch (error) {
    console.error('Error generating HTML:', error);
    return [];
  }
};
