/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';
import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  $isRootNode,
  LexicalCommand,
} from 'lexical';
import { $findMatchingParent, $wrapNodeInElement, mergeRegister } from '@lexical/utils';
import { COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';

import { $createSketchNode, SketchNode, SketchPayload } from '@repo/editor/nodes/SketchNode';
import { $isImageNode } from '@repo/editor/nodes/ImageNode';

export type InsertSketchPayload = Readonly<SketchPayload>;

export const INSERT_SKETCH_COMMAND: LexicalCommand<InsertSketchPayload> = createCommand();

export default function SketchPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([SketchNode])) {
      throw new Error('SketchPlugin: SketchNode not registered on editor');
    }

    return mergeRegister(
      editor.registerCommand<InsertSketchPayload>(
        INSERT_SKETCH_COMMAND,
        (payload) => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const imageNode = $findMatchingParent(selection.anchor.getNode(), $isImageNode);
            imageNode?.remove();
          }
          const sketchNode = $createSketchNode(payload);
          sketchNode.append($createTextNode(payload.altText || 'Sketch'));
          $insertNodes([sketchNode]);
          if ($isRootNode(sketchNode.getParentOrThrow())) {
            $wrapNodeInElement(sketchNode, $createParagraphNode).selectEnd();
          }
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    );
  }, [editor]);

  return null;
}
