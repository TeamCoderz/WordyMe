/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { cva, type VariantProps } from 'class-variance-authority';
import {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  ElementDOMSlot,
  ElementNode,
  isHTMLElement,
  LexicalNode,
  LexicalEditor,
  LexicalUpdateJSON,
  NodeKey,
  SerializedElementNode,
} from 'lexical';

const alertVariants = cva(
  'LexicalTheme__alert relative w-full rounded-lg border p-2 mb-2 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-baseline [&>svg]:size-4 [&>svg]:translate-y-1 [&>svg]:text-current',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        success: 'bg-green-500/20 border-green-500/40',
        error: 'bg-red-500/20 border-red-500/40',
        warning: 'bg-yellow-500/20 border-yellow-500/40',
        info: 'bg-blue-500/20 border-blue-500/40',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export type AlertVariant = NonNullable<VariantProps<typeof alertVariants>['variant']>;

const alertIcons: Record<AlertVariant, string> = {
  default: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
  success: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="m9 12 2 2 4-4"></path></svg>`,
  error: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
  warning: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
  info: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
};

type SerializedAlertNode = SerializedElementNode & {
  variant: AlertVariant;
};

export class AlertNode extends ElementNode {
  __variant: AlertVariant;

  constructor(variant: AlertVariant = 'default', key?: NodeKey) {
    super(key);
    this.__variant = variant;
  }

  static getType(): string {
    return 'alert';
  }

  static clone(node: AlertNode): AlertNode {
    return new AlertNode(node.__variant, node.__key);
  }

  getVariant(): AlertVariant {
    return this.__variant;
  }

  setVariant(variant: AlertVariant): this {
    const self = this.getWritable();
    self.__variant = variant;
    return self;
  }

  createDOM(): HTMLElement {
    const dom = document.createElement('div');
    const variant = this.__variant;
    dom.className = alertVariants({ variant });
    dom.setAttribute('role', 'alert');
    dom.setAttribute('data-lexical-alert', 'true');

    const icon = alertIcons[variant];
    dom.insertAdjacentHTML('afterbegin', icon);

    const description = document.createElement('div');
    description.className = 'alert-description *:last:!mb-0';
    dom.appendChild(description);

    return dom;
  }

  getDOMSlot(element: HTMLElement): ElementDOMSlot<HTMLElement> {
    return super.getDOMSlot(element).withElement(element.querySelector('.alert-description')!);
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const output = super.exportDOM(editor);
    const element = output.element;
    if (!isHTMLElement(element)) {
      return output;
    }
    return {
      element,
      after: (element) => {
        if (output.after) {
          element = output.after(element);
        }
        if (!isHTMLElement(element)) {
          return null;
        }
        const description = element.querySelector('.alert-description');
        if (description) {
          const nextSiblings = element.querySelectorAll('.alert-description + *');
          description.append(...Array.from(nextSiblings));
        }
        return element;
      },
    };
  }

  updateDOM(prevNode: AlertNode): boolean {
    return prevNode.__variant !== this.__variant;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute('data-lexical-alert')) {
          return null;
        }
        return {
          conversion: $convertAlertElement,
          priority: 2,
        };
      },
    };
  }

  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedAlertNode>): this {
    return super.updateFromJSON(serializedNode).setVariant(serializedNode.variant);
  }

  static importJSON(serializedNode: SerializedAlertNode): AlertNode {
    return $createAlertNode().updateFromJSON(serializedNode);
  }

  isShadowRoot(): boolean {
    return true;
  }

  exportJSON(): SerializedAlertNode {
    return {
      ...super.exportJSON(),
      type: 'alert',
      variant: this.__variant,
      version: 1,
    };
  }
}

export function $convertAlertElement(): DOMConversionOutput | null {
  const node = $createAlertNode();
  return {
    node,
  };
}

export function $createAlertNode(): AlertNode {
  return new AlertNode();
}

export function $isAlertNode(node: LexicalNode | null | undefined): node is AlertNode {
  return node instanceof AlertNode;
}
