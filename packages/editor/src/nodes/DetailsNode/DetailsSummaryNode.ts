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

import {
  $createParagraphNode,
  $isElementNode,
  DOMConversionMap,
  DOMConversionOutput,
  EditorConfig,
  ElementNode,
  LexicalEditor,
  LexicalNode,
  RangeSelection,
  SerializedElementNode,
} from 'lexical';
import { IS_CHROME } from '@lexical/utils';
import invariant from '@repo/shared/invariant';
import { cva } from 'class-variance-authority';

import { $isDetailsContainerNode } from './DetailsContainerNode';
import { $isDetailsContentNode } from './DetailsContentNode';

const detailsSummaryVariants = cva(
  "cursor-pointer py-2 pr-8 pl-2 relative list-none outline-none [&::marker]:hidden [&::-webkit-details-marker]:hidden before:content-[''] before:block before:box-border before:absolute before:w-2.5 before:h-2.5 before:border-b-2 before:border-r-2 before:border-current before:right-4 before:top-1/2 before:-translate-y-[75%] before:rotate-45 before:transition-transform data-[open]:before:-translate-y-[25%] data-[open]:before:-rotate-[135deg] [&[dir='rtl']]:pr-2 [&[dir='rtl']]:pl-8 [&[dir='rtl']]:before:right-auto [&[dir='rtl']]:before:left-4 hover:bg-black/5 dark:hover:bg-white/8 data-[open]:bg-black/5 dark:data-[open]:bg-white/8 [&[contenteditable='false']]:select-none [&>*:last-child]:!mb-0",
);

type SerializedDetailsSummaryNode = SerializedElementNode & {
  editable: boolean;
};

export function $convertSummaryElement(): DOMConversionOutput | null {
  const node = $createDetailsSummaryNode();
  return {
    node,
  };
}

export class DetailsSummaryNode extends ElementNode {
  __editable: boolean;
  static getType(): string {
    return 'details-summary';
  }

  static clone(node: DetailsSummaryNode): DetailsSummaryNode {
    const summaryNode = new DetailsSummaryNode(node.__key);
    summaryNode.__editable = node.__editable;
    return summaryNode;
  }

  constructor(key?: string) {
    super(key);
    this.__editable = true;
  }

  createDOM(_config: EditorConfig, editor: LexicalEditor): HTMLElement {
    const dom = document.createElement('summary');
    dom.className = detailsSummaryVariants();

    // Set initial open state
    editor.getEditorState().read(() => {
      const containerNode = this.getParentOrThrow();
      if ($isDetailsContainerNode(containerNode)) {
        if (containerNode.getOpen()) {
          dom.setAttribute('data-open', '');
        }
      }
    });

    if (IS_CHROME) {
      dom.addEventListener('click', () => {
        editor.update(() => {
          const Details = this.getLatest().getParentOrThrow();
          invariant(
            $isDetailsContainerNode(Details),
            'Expected parent node to be a DetailsContainerNode',
          );
          Details.toggleOpen();
          const editable = Details.getEditable();
          if (!editable) Details.select();
        });
      });
    }
    if (this.__editable === false) dom.setAttribute('contenteditable', 'false');
    return dom;
  }

  updateDOM(prevNode: DetailsSummaryNode, dom: HTMLElement): boolean {
    let shouldUpdate = false;

    if (prevNode.__editable !== this.__editable) {
      if (this.__editable) {
        dom.removeAttribute('contenteditable');
      } else {
        dom.setAttribute('contenteditable', 'false');
      }
      shouldUpdate = true;
    }

    // Update open state based on parent container
    const containerNode = this.getParentOrThrow();
    if ($isDetailsContainerNode(containerNode)) {
      const isOpen = containerNode.getOpen();
      const prevContainerNode = prevNode.getParentOrThrow();
      if ($isDetailsContainerNode(prevContainerNode)) {
        const wasOpen = prevContainerNode.getOpen();
        if (isOpen !== wasOpen) {
          if (isOpen) {
            dom.setAttribute('data-open', '');
          } else {
            dom.removeAttribute('data-open');
          }
          shouldUpdate = true;
        }
      }
    }

    return shouldUpdate;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      summary: () => {
        return {
          conversion: $convertSummaryElement,
          priority: 1,
        };
      },
    };
  }

  static importJSON(serializedNode: SerializedDetailsSummaryNode): DetailsSummaryNode {
    const summaryNode = $createDetailsSummaryNode();
    summaryNode.__editable = serializedNode.editable;
    return summaryNode;
  }

  exportJSON(): SerializedDetailsSummaryNode {
    return {
      ...super.exportJSON(),
      editable: this.__editable,
      type: 'details-summary',
      version: 1,
    };
  }

  collapseAtStart(): boolean {
    this.getParentOrThrow().insertBefore(this);
    return true;
  }

  static transform(): (node: LexicalNode) => void {
    return (node: LexicalNode) => {
      invariant($isDetailsSummaryNode(node), 'node is not a DetailsSummaryNode');
      if (node.isEmpty()) {
        node.remove();
      }
    };
  }

  insertNewAfter(_: RangeSelection, restoreSelection = true): ElementNode {
    const containerNode = this.getParentOrThrow();

    if (!$isDetailsContainerNode(containerNode)) {
      throw new Error('DetailsSummaryNode expects to be child of DetailsContainerNode');
    }

    if (containerNode.getOpen()) {
      const contentNode = this.getNextSibling();
      if (!$isDetailsContentNode(contentNode)) {
        throw new Error('DetailsSummaryNode expects to have DetailsContentNode sibling');
      }

      const firstChild = contentNode.getFirstChild();
      if ($isElementNode(firstChild)) {
        return firstChild;
      } else {
        const paragraph = $createParagraphNode();
        contentNode.append(paragraph);
        return paragraph;
      }
    } else {
      const paragraph = $createParagraphNode();
      containerNode.insertAfter(paragraph, restoreSelection);
      return paragraph;
    }
  }

  setEditable(editable: boolean): void {
    const writable = this.getWritable();
    writable.__editable = editable;
  }

  getEditable(): boolean {
    return this.getLatest().__editable;
  }
}

export function $createDetailsSummaryNode(): DetailsSummaryNode {
  return new DetailsSummaryNode();
}

export function $isDetailsSummaryNode(
  node: LexicalNode | null | undefined,
): node is DetailsSummaryNode {
  return node instanceof DetailsSummaryNode;
}
