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
  isHTMLElement,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedElementNode,
  Spread,
} from 'lexical';
import { IS_CHROME } from '@lexical/utils';
import invariant from '@repo/shared/invariant';
import { cva, type VariantProps } from 'class-variance-authority';

import { setDomHiddenUntilFound } from './utils';

const detailsVariants = cva('details__container overflow-hidden', {
  variants: {
    variant: {
      sharp: 'rounded-none',
      rounded: 'rounded-lg',
    },
  },
  defaultVariants: {
    variant: 'rounded',
  },
});

export type DetailsVariant = NonNullable<VariantProps<typeof detailsVariants>['variant']>;

export type SerializedDetailsContainerNode = Spread<
  {
    open: boolean;
    editable: boolean;
    variant: DetailsVariant;
  },
  SerializedElementNode
>;

export function $convertDetailsElement(domNode: HTMLDetailsElement): DOMConversionOutput | null {
  const isOpen = domNode.open !== undefined ? domNode.open : true;
  const variant = (domNode.getAttribute('data-variant') as DetailsVariant) || 'rounded';
  const node = $createDetailsContainerNode(isOpen, variant);
  return {
    node,
  };
}

export class DetailsContainerNode extends ElementNode {
  __open: boolean;
  __editable: boolean;
  __variant: DetailsVariant;

  constructor(open: boolean, variant: DetailsVariant = 'rounded', key?: NodeKey) {
    super(key);
    this.__open = open;
    this.__editable = true;
    this.__variant = variant;
  }

  static getType(): string {
    return 'details-container';
  }

  static clone(node: DetailsContainerNode): DetailsContainerNode {
    const containerNode = new DetailsContainerNode(node.__open, node.__variant, node.__key);
    containerNode.__editable = node.__editable;
    return containerNode;
  }

  getVariant(): DetailsVariant {
    return this.__variant;
  }

  setVariant(variant: DetailsVariant): this {
    const self = this.getWritable();
    self.__variant = variant;
    return self;
  }

  createDOM(_config: EditorConfig, editor: LexicalEditor): HTMLElement {
    // details is not well supported in Chrome #5582
    let dom: HTMLElement;
    if (IS_CHROME) {
      dom = document.createElement('div');
      dom.setAttribute('open', '');
      if (!this.__open) dom.removeAttribute('open');
    } else {
      const detailsDom = document.createElement('details');
      detailsDom.open = this.__open;
      detailsDom.addEventListener('toggle', () => {
        const open = editor.getEditorState().read(() => this.getOpen());
        if (open !== detailsDom.open) {
          editor.update(() => this.toggleOpen());
        }
      });
      dom = detailsDom;
    }
    dom.className = detailsVariants({ variant: this.__variant });
    dom.setAttribute('data-variant', this.__variant);
    if (this.__editable === false) dom.setAttribute('contenteditable', 'false');
    return dom;
  }

  updateDOM(prevNode: DetailsContainerNode, dom: HTMLDetailsElement): boolean {
    let shouldUpdate = false;

    const currentOpen = this.__open;
    if (prevNode.__open !== currentOpen) {
      // details is not well supported in Chrome #5582
      if (IS_CHROME) {
        const contentDom = dom.children[1];
        invariant(isHTMLElement(contentDom), 'Expected contentDom to be an HTMLElement');
        if (currentOpen) {
          dom.setAttribute('open', '');
          contentDom.hidden = false;
        } else {
          dom.removeAttribute('open');
          setDomHiddenUntilFound(contentDom);
        }
      } else {
        dom.open = this.__open;
      }
      shouldUpdate = true;
    }

    if (prevNode.__editable !== this.__editable) {
      if (this.__editable) {
        dom.removeAttribute('contenteditable');
      } else {
        dom.setAttribute('contenteditable', 'false');
      }
      shouldUpdate = true;
    }

    if (prevNode.__variant !== this.__variant) {
      dom.className = detailsVariants({ variant: this.__variant });
      dom.setAttribute('data-variant', this.__variant);
      shouldUpdate = true;
    }

    return shouldUpdate;
  }

  static importDOM(): DOMConversionMap<HTMLDetailsElement> | null {
    return {
      details: () => {
        return {
          conversion: $convertDetailsElement,
          priority: 1,
        };
      },
    };
  }

  static importJSON(serializedNode: SerializedDetailsContainerNode): DetailsContainerNode {
    const node = new DetailsContainerNode(serializedNode.open, serializedNode.variant);
    node.__editable = serializedNode.editable;
    return node;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('details');
    element.className = detailsVariants({ variant: this.__variant });
    element.setAttribute('data-variant', this.__variant);
    element.setAttribute('open', '');
    if (!this.__open) element.removeAttribute('open');
    if (this.__editable === false) element.setAttribute('contenteditable', 'false');
    return { element };
  }

  exportJSON(): SerializedDetailsContainerNode {
    return {
      ...super.exportJSON(),
      open: this.__open,
      editable: this.__editable,
      variant: this.__variant,
      type: 'details-container',
      version: 1,
    };
  }

  setOpen(open: boolean): void {
    const writable = this.getWritable();
    writable.__open = open;
  }

  getOpen(): boolean {
    return this.getLatest().__open;
  }

  toggleOpen(): void {
    this.setOpen(!this.getOpen());
  }

  setEditable(editable: boolean): void {
    const writable = this.getWritable();
    writable.__editable = editable;
  }

  getEditable(): boolean {
    return this.getLatest().__editable;
  }
}

export function $createDetailsContainerNode(
  isOpen: boolean,
  variant: DetailsVariant = 'rounded',
): DetailsContainerNode {
  return new DetailsContainerNode(isOpen, variant);
}

export function $isDetailsContainerNode(
  node: LexicalNode | null | undefined,
): node is DetailsContainerNode {
  return node instanceof DetailsContainerNode;
}
