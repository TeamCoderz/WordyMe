/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $findMatchingParent, mergeRegister } from '@lexical/utils';
import {
  $createParagraphNode,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  createCommand,
  DELETE_CHARACTER_COMMAND,
  ElementNode,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
} from 'lexical';
import { useEffect } from 'react';

import { $createAlertNode, $isAlertNode, AlertNode } from '@repo/editor/nodes/AlertNode';

export const INSERT_ALERT_COMMAND = createCommand<void>();

export default function AlertPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNode(AlertNode)) {
      throw new Error('AlertPlugin: AlertNode is not registered on editor');
    }

    const $onEscapeUp = () => {
      const selection = $getSelection();
      if (
        $isRangeSelection(selection) &&
        selection.isCollapsed() &&
        selection.anchor.offset === 0
      ) {
        const alertNode = $findMatchingParent(selection.anchor.getNode(), $isAlertNode);

        if ($isAlertNode(alertNode)) {
          const parent = alertNode.getParent<ElementNode>();
          if (
            parent !== null &&
            parent.getFirstChild() === alertNode &&
            selection.anchor.key === alertNode.getFirstDescendant()?.getKey()
          ) {
            alertNode.insertBefore($createParagraphNode());
          }
        }
      }

      return false;
    };

    const $onEscapeDown = () => {
      const selection = $getSelection();
      if ($isRangeSelection(selection) && selection.isCollapsed()) {
        const alertNode = $findMatchingParent(selection.anchor.getNode(), $isAlertNode);

        if ($isAlertNode(alertNode)) {
          const parent = alertNode.getParent<ElementNode>();
          if (parent !== null && parent.getLastChild() === alertNode) {
            const firstChild = alertNode.getFirstDescendant();
            const lastChild = alertNode.getLastDescendant();

            if (
              (lastChild !== null &&
                selection.anchor.key === lastChild.getKey() &&
                selection.anchor.offset === lastChild.getTextContentSize()) ||
              (firstChild !== null &&
                selection.anchor.key === firstChild.getKey() &&
                selection.anchor.offset === firstChild.getTextContentSize())
            ) {
              alertNode.insertAfter($createParagraphNode());
            }
          }
        }
      }

      return false;
    };

    const $handleDelete = (isBackward: boolean) => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
        return false;
      }

      const node = selection.anchor.getNode();
      const alertNode = $findMatchingParent(node, $isAlertNode);
      if (!$isAlertNode(alertNode)) {
        return false;
      }

      // Check if the alert node is empty and should be removed
      const children = alertNode.getChildren();
      const isEmpty = children.length === 1 && children[0].getTextContentSize() === 0;

      // Handle backspace at beginning or delete at end of content
      if (
        (isBackward && selection.anchor.offset === 0) ||
        (!isBackward && selection.anchor.offset === node.getTextContentSize())
      ) {
        // Special case: delete empty alert node
        if (isEmpty) {
          const newParagraph = $createParagraphNode();
          alertNode.insertBefore(newParagraph);
          alertNode.remove();
          newParagraph.select();
          return true;
        }

        // Prevent deletion at boundaries of non-empty alert
        const isAtBoundary = isBackward
          ? selection.anchor.key === alertNode.getFirstDescendant()?.getKey()
          : selection.anchor.key === alertNode.getLastDescendant()?.getKey();

        if (isAtBoundary) {
          return true;
        }
      }

      return false;
    };

    return mergeRegister(
      // When Alert is the last child pressing down/right arrow will insert paragraph
      // below it to allow adding more content. It's similar what $insertBlockNode
      // (mainly for decorators), except it'll always be possible to continue adding
      // new content even if trailing paragraph is accidentally deleted
      editor.registerCommand(KEY_ARROW_DOWN_COMMAND, $onEscapeDown, COMMAND_PRIORITY_LOW),

      editor.registerCommand(KEY_ARROW_RIGHT_COMMAND, $onEscapeDown, COMMAND_PRIORITY_LOW),

      // When Alert is the first child pressing up/left arrow will insert paragraph
      // above it to allow adding more content. It's similar what $insertBlockNode
      // (mainly for decorators), except it'll always be possible to continue adding
      // new content even if leading paragraph is accidentally deleted
      editor.registerCommand(KEY_ARROW_UP_COMMAND, $onEscapeUp, COMMAND_PRIORITY_LOW),

      editor.registerCommand(KEY_ARROW_LEFT_COMMAND, $onEscapeUp, COMMAND_PRIORITY_LOW),

      editor.registerCommand(DELETE_CHARACTER_COMMAND, $handleDelete, COMMAND_PRIORITY_LOW),

      editor.registerCommand(
        INSERT_ALERT_COMMAND,
        () => {
          editor.update(() => {
            const paragraph = $createParagraphNode();
            $insertNodes([$createAlertNode().append(paragraph)]);
            paragraph.select();
          });
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor]);

  return null;
}
