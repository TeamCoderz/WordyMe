/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  ElementNode,
  LexicalEditor,
  LexicalNode,
  SerializedElementNode,
} from 'lexical';
import { IS_CHROME } from '@lexical/utils';
import invariant from '@repo/shared/invariant';
import { cva } from 'class-variance-authority';

import { $isDetailsContainerNode } from './DetailsContainerNode';
import { domOnBeforeMatch, setDomHiddenUntilFound } from './utils';

const detailsContentVariants = cva(
  'p-2 [&[hidden]]:hidden data-[hidden]:hidden [&>*:last-child]:!mb-0',
);

type SerializedDetailsContentNode = SerializedElementNode;

export function $convertDetailsContentElement(): DOMConversionOutput | null {
  const node = $createDetailsContentNode();
  return {
    node,
  };
}

export class DetailsContentNode extends ElementNode {
  static getType(): string {
    return 'details-content';
  }

  static clone(node: DetailsContentNode): DetailsContentNode {
    return new DetailsContentNode(node.__key);
  }

  createDOM(_config: EditorConfig, editor: LexicalEditor): HTMLElement {
    const dom = document.createElement('div');
    dom.className = detailsContentVariants();

    // Set initial hidden state
    editor.getEditorState().read(() => {
      const containerNode = this.getParentOrThrow();
      invariant(
        $isDetailsContainerNode(containerNode),
        'Expected parent node to be a DetailsContainerNode',
      );
      if (!containerNode.getOpen()) {
        if (IS_CHROME) {
          setDomHiddenUntilFound(dom);
        } else {
          dom.setAttribute('data-hidden', '');
        }
      }
    });

    if (IS_CHROME) {
      domOnBeforeMatch(dom, () => {
        editor.update(() => {
          const containerNode = this.getParentOrThrow().getLatest();
          invariant(
            $isDetailsContainerNode(containerNode),
            'Expected parent node to be a DetailsContainerNode',
          );
          if (!containerNode.__open) {
            containerNode.toggleOpen();
          }
        });
      });
    }
    return dom;
  }

  updateDOM(prevNode: DetailsContentNode, dom: HTMLElement): boolean {
    // Update hidden state based on parent container
    const containerNode = this.getParentOrThrow();
    if ($isDetailsContainerNode(containerNode)) {
      const isOpen = containerNode.getOpen();
      const prevContainerNode = prevNode.getParentOrThrow();
      if ($isDetailsContainerNode(prevContainerNode)) {
        const wasOpen = prevContainerNode.getOpen();
        if (isOpen !== wasOpen) {
          if (!IS_CHROME) {
            if (isOpen) {
              dom.removeAttribute('data-hidden');
            } else {
              dom.setAttribute('data-hidden', '');
            }
          }
          return true;
        }
      }
    }
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute('data-lexical-Details-content')) {
          return null;
        }
        return {
          conversion: $convertDetailsContentElement,
          priority: 2,
        };
      },
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('div');
    element.className = detailsContentVariants();
    element.setAttribute('data-lexical-Details-content', 'true');
    return { element };
  }

  static importJSON(): DetailsContentNode {
    return $createDetailsContentNode();
  }

  isShadowRoot(): boolean {
    return true;
  }

  exportJSON(): SerializedDetailsContentNode {
    return {
      ...super.exportJSON(),
      type: 'details-content',
      version: 1,
    };
  }
}

export function $createDetailsContentNode(): DetailsContentNode {
  return new DetailsContentNode();
}

export function $isDetailsContentNode(
  node: LexicalNode | null | undefined,
): node is DetailsContentNode {
  return node instanceof DetailsContentNode;
}
