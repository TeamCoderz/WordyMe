/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  DOMConversionMap,
  DOMConversionOutput,
  EditorConfig,
  ElementNode,
  LexicalEditor,
  LexicalNode,
  LexicalUpdateJSON,
  NodeKey,
  SerializedElementNode,
} from 'lexical';
import { floatWrapperElement, getStyleObjectFromRawCSS } from '@repo/editor/utils/nodeUtils';

import { buttonVariants } from '@repo/ui/components/button';
import { cn } from '@repo/ui/lib/utils';

type SerializedStickyNode = SerializedElementNode & {
  style: string;
};

export class StickyNode extends ElementNode {
  constructor(key?: NodeKey) {
    super(key);
    this.__style = 'color:#0a0a0a;background-color:#bceac4;float:right;';
  }

  static getType(): string {
    return 'sticky';
  }

  static clone(node: StickyNode): StickyNode {
    return new StickyNode(node.__key);
  }

  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement {
    const dom = document.createElement('div');
    dom.className = 'LexicalTheme__sticky group group/sticky light relative';
    const style = getStyleObjectFromRawCSS(this.__style);
    const color = style.color;
    const backgroundColor = style['background-color'];
    const float = style.float;
    dom.style.color = color ?? '';
    dom.style.backgroundColor = backgroundColor ?? '';
    floatWrapperElement(dom, config, float);

    if (editor.isEditable()) {
      // Create drag button that appears on hover
      const dragButton = document.createElement('button');
      dragButton.draggable = true;
      dragButton.className = cn(
        buttonVariants({ variant: 'ghost', size: 'icon' }),
        `!bg-transparent !text-muted opacity-0 group-hover/sticky:opacity-100 transition-opacity print:hidden absolute top-2 left-2 z-10
      cursor-grab active:cursor-grabbing hover:font-bold hover:opacity-100 &/svg:pointer-events-none size-6`,
      );
      dragButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-grip-vertical h-4 w-4"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>`;
      dragButton.setAttribute('aria-label', 'Drag sticky note');
      dom.appendChild(dragButton);
    }
    return dom;
  }

  updateDOM(prevNode: StickyNode, dom: HTMLElement, config: EditorConfig): boolean {
    if (this.__style !== prevNode.__style) {
      const style = getStyleObjectFromRawCSS(this.__style);
      const color = style.color;
      const backgroundColor = style['background-color'];
      const float = style.float;
      dom.style.color = color ?? '';
      dom.style.backgroundColor = backgroundColor ?? '';
      floatWrapperElement(dom, config, float);
    }

    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute('data-lexical-sticky')) {
          return null;
        }
        return {
          conversion: $convertStickyElement,
          priority: 2,
        };
      },
    };
  }

  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedStickyNode>): this {
    return super.updateFromJSON(serializedNode).setStyle(serializedNode.style);
  }

  static importJSON(serializedNode: SerializedStickyNode): StickyNode {
    return $createStickyNode().updateFromJSON(serializedNode);
  }

  isShadowRoot(): boolean {
    return true;
  }

  isInline(): boolean {
    return false;
  }

  exportJSON(): SerializedStickyNode {
    return {
      ...super.exportJSON(),
      type: 'sticky',
      style: this.__style,
    };
  }
}

export function $convertStickyElement(): DOMConversionOutput | null {
  const node = $createStickyNode();
  return {
    node,
  };
}

export function $createStickyNode(): StickyNode {
  return new StickyNode();
}

export function $isStickyNode(node: LexicalNode | null | undefined): node is StickyNode {
  return node instanceof StickyNode;
}
