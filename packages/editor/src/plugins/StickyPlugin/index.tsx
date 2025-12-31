'use client';
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  LexicalCommand,
  $createParagraphNode,
  $insertNodes,
  $isRangeSelection,
  DELETE_CHARACTER_COMMAND,
  ElementNode,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  $getNearestNodeFromDOMNode,
  isHTMLElement,
  $addUpdateTag,
  HISTORY_PUSH_TAG,
} from 'lexical';
import { useEffect } from 'react';
import { mergeRegister, $findMatchingParent } from '@lexical/utils';
import {
  $createRangeSelection,
  $getSelection,
  $setSelection,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  createCommand,
  DRAGOVER_COMMAND,
  DRAGSTART_COMMAND,
  DROP_COMMAND,
} from 'lexical';

import { $createStickyNode, $isStickyNode, StickyNode } from '@repo/editor/nodes/StickyNode';
import { getSelectedNode } from '@repo/editor/utils/getSelectedNode';

export const INSERT_STICKY_COMMAND: LexicalCommand<undefined> = createCommand();

export default function StickyPlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!editor.hasNodes([StickyNode])) {
      throw new Error('StickyPlugin: StickyNode not registered on editor');
    }

    const $onEscapeUp = () => {
      const selection = $getSelection();
      if (
        $isRangeSelection(selection) &&
        selection.isCollapsed() &&
        selection.anchor.offset === 0
      ) {
        const stickyNode = $findMatchingParent(selection.anchor.getNode(), $isStickyNode);

        if ($isStickyNode(stickyNode)) {
          const parent = stickyNode.getParent<ElementNode>();
          if (
            parent !== null &&
            parent.getFirstChild() === stickyNode &&
            selection.anchor.key === stickyNode.getFirstDescendant()?.getKey()
          ) {
            stickyNode.insertBefore($createParagraphNode());
          }
        }
      }

      return false;
    };

    const $onEscapeDown = () => {
      const selection = $getSelection();
      if ($isRangeSelection(selection) && selection.isCollapsed()) {
        const stickyNode = $findMatchingParent(selection.anchor.getNode(), $isStickyNode);

        if ($isStickyNode(stickyNode)) {
          const parent = stickyNode.getParent<ElementNode>();
          if (parent !== null && parent.getLastChild() === stickyNode) {
            const firstChild = stickyNode.getFirstDescendant();
            const lastChild = stickyNode.getLastDescendant();

            if (
              (lastChild !== null &&
                selection.anchor.key === lastChild.getKey() &&
                selection.anchor.offset === lastChild.getTextContentSize()) ||
              (firstChild !== null &&
                selection.anchor.key === firstChild.getKey() &&
                selection.anchor.offset === firstChild.getTextContentSize())
            ) {
              stickyNode.insertAfter($createParagraphNode());
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
      const stickyNode = $findMatchingParent(node, $isStickyNode);
      if (!$isStickyNode(stickyNode)) {
        return false;
      }

      // Check if the sticky node is empty and should be removed
      const children = stickyNode.getChildren();
      const isEmpty = children.length === 1 && children[0].getTextContentSize() === 0;

      // Handle backspace at beginning or delete at end of content
      if (
        (isBackward && selection.anchor.offset === 0) ||
        (!isBackward && selection.anchor.offset === node.getTextContentSize())
      ) {
        // Special case: delete empty sticky node
        if (isEmpty) {
          const newParagraph = $createParagraphNode();
          stickyNode.insertBefore(newParagraph);
          stickyNode.remove();
          newParagraph.selectEnd();
          return true;
        }

        // Prevent deletion at boundaries of non-empty sticky
        const isAtBoundary = isBackward
          ? selection.anchor.key === stickyNode.getFirstDescendant()?.getKey()
          : selection.anchor.key === stickyNode.getLastDescendant()?.getKey();

        if (isAtBoundary) {
          return true;
        }
      }

      return false;
    };

    return mergeRegister(
      // When Sticky is the last child pressing down/right arrow will insert paragraph
      // below it to allow adding more content. It's similar what $insertBlockNode
      // (mainly for decorators), except it'll always be possible to continue adding
      // new content even if trailing paragraph is accidentally deleted
      editor.registerCommand(KEY_ARROW_DOWN_COMMAND, $onEscapeDown, COMMAND_PRIORITY_LOW),

      editor.registerCommand(KEY_ARROW_RIGHT_COMMAND, $onEscapeDown, COMMAND_PRIORITY_LOW),

      // When Sticky is the first child pressing up/left arrow will insert paragraph
      // above it to allow adding more content. It's similar what $insertBlockNode
      // (mainly for decorators), except it'll always be possible to continue adding
      // new content even if leading paragraph is accidentally deleted
      editor.registerCommand(KEY_ARROW_UP_COMMAND, $onEscapeUp, COMMAND_PRIORITY_LOW),

      editor.registerCommand(KEY_ARROW_LEFT_COMMAND, $onEscapeUp, COMMAND_PRIORITY_LOW),

      editor.registerCommand(DELETE_CHARACTER_COMMAND, $handleDelete, COMMAND_PRIORITY_LOW),

      editor.registerCommand(
        INSERT_STICKY_COMMAND,
        () => {
          const stickyNode = $createStickyNode();
          const paragraph = $createParagraphNode();
          stickyNode.append(paragraph);
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const anchorNode = selection.anchor.getNode();
            const topLevelElement = anchorNode.getTopLevelElementOrThrow();
            topLevelElement.insertBefore(stickyNode);
          } else {
            $insertNodes([stickyNode]);
          }
          paragraph.selectEnd();
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand<DragEvent>(
        DRAGSTART_COMMAND,
        (event) => {
          return onDragStart(event);
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand<DragEvent>(
        DRAGOVER_COMMAND,
        (event) => {
          return onDragover(event);
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand<DragEvent>(
        DROP_COMMAND,
        (event) => {
          return onDrop(event);
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [editor]);

  return null;
}

function onDragStart(event: DragEvent): boolean {
  const target = event.target;
  if (!isHTMLElement(target)) return false;
  const figure = target.parentElement;
  if (!figure) return false;
  const node = getNodeFromTarget(event.target);
  if (!node) {
    return false;
  }
  const dataTransfer = event.dataTransfer;
  if (!dataTransfer) {
    return false;
  }
  dataTransfer.setData('text/plain', '_');
  dataTransfer.setDragImage(figure, 0, 0);

  node.selectEnd();
  return true;
}

function onDragover(event: DragEvent): boolean {
  const node = getNodeInSelection();
  if (!node) {
    return false;
  }
  if (!canDropSticky(event)) {
    event.preventDefault();
  }
  return true;
}

function onDrop(event: DragEvent): boolean {
  const node = getNodeInSelection();
  if (!node) {
    return false;
  }
  event.preventDefault();
  if (canDropSticky(event)) {
    const range = getDragSelection(event);
    const rangeSelection = $createRangeSelection();
    if (range !== null && range !== undefined) {
      rangeSelection.applyDOMRange(range);
    }
    $setSelection(rangeSelection);
    const anchorNode = rangeSelection.anchor.getNode();
    const topLevelElement = anchorNode.getTopLevelElementOrThrow();
    topLevelElement.insertBefore(node);
    $addUpdateTag(HISTORY_PUSH_TAG);
  }
  node.selectEnd();
  return true;
}

function getNodeInSelection(): StickyNode | null {
  const selection = $getSelection();
  if ($isRangeSelection(selection)) {
    const node = getSelectedNode(selection);
    return $findMatchingParent(node, $isStickyNode);
  }
  return null;
}

function getNodeFromTarget(target: EventTarget | null): StickyNode | null {
  if (!isHTMLElement(target)) return null;
  const node = $getNearestNodeFromDOMNode(target);
  if (!node) return null;
  return $findMatchingParent(node, $isStickyNode);
}

declare global {
  interface DragEvent {
    rangeOffset?: number;
    rangeParent?: Node;
  }
}

function canDropSticky(event: DragEvent): boolean {
  const target = event.target;
  return !!(
    target &&
    target instanceof HTMLElement &&
    !target.closest('code, figure, div.sticky-note') &&
    target.parentElement &&
    target.parentElement.closest('div.editor-input')
  );
}

function getDragSelection(event: DragEvent): Range | null | undefined {
  let range;
  const domSelection = getSelection();
  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(event.clientX, event.clientY);
  } else if (event.rangeParent && domSelection !== null) {
    domSelection.collapse(event.rangeParent, event.rangeOffset || 0);
    range = domSelection.getRangeAt(0);
  } else {
    throw Error(`Cannot get the selection when dragging`);
  }

  return range;
}
