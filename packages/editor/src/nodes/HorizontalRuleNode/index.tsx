/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { cva, type VariantProps } from 'class-variance-authority';
import type {
  DOMConversionMap,
  DOMConversionOutput,
  EditorConfig,
  LexicalCommand,
  LexicalNode,
  LexicalUpdateJSON,
  SerializedLexicalNode,
} from 'lexical';

import { $applyNodeReplacement, createCommand, DecoratorNode } from 'lexical';
import { JSX } from 'react';
import HorizontalRuleComponent from './HorizontalRuleComponent';
import { addClassNamesToElement } from '@lexical/utils';

const horizontalRuleVariants = cva('w-full border-t clear-both py-2 m-0', {
  variants: {
    variant: {
      single: 'border-gray-300 dark:border-gray-700',
      dashed: 'border-dashed border-gray-300 dark:border-gray-700',
      dotted: 'border-dotted border-gray-300 dark:border-gray-700',
      double: 'border-double border-gray-300 dark:border-gray-700 border-t-4',
    },
  },
  defaultVariants: {
    variant: 'single',
  },
});

export type HorizontalRuleVariant = NonNullable<
  VariantProps<typeof horizontalRuleVariants>['variant']
>;

export type SerializedHorizontalRuleNode = SerializedLexicalNode & {
  variant: HorizontalRuleVariant;
};

export const INSERT_HORIZONTAL_RULE_COMMAND: LexicalCommand<void> = createCommand(
  'INSERT_HORIZONTAL_RULE_COMMAND',
);

export class HorizontalRuleNode extends DecoratorNode<JSX.Element> {
  __variant: HorizontalRuleVariant;

  constructor(key?: string) {
    super(key);
    this.__variant = 'single';
  }

  static getType(): string {
    return 'horizontalrule';
  }

  static clone(node: HorizontalRuleNode): HorizontalRuleNode {
    return new HorizontalRuleNode(node.__key);
  }

  getVariant(): HorizontalRuleVariant {
    return this.__variant;
  }

  setVariant(variant: HorizontalRuleVariant): this {
    const self = this.getWritable();
    self.__variant = variant;
    return self;
  }

  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedHorizontalRuleNode>): this {
    return super.updateFromJSON(serializedNode).setVariant(serializedNode.variant);
  }

  static importJSON(serializedNode: SerializedHorizontalRuleNode): HorizontalRuleNode {
    return $createHorizontalRuleNode().updateFromJSON(serializedNode);
  }

  static importDOM(): DOMConversionMap | null {
    return {
      hr: () => ({
        conversion: convertHorizontalRuleElement,
        priority: 0,
      }),
    };
  }

  exportJSON(): SerializedHorizontalRuleNode {
    return {
      type: 'horizontalrule',
      variant: this.__variant,
      version: 1,
    };
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement('hr');
    const className = config.theme.hr;
    if (className !== undefined) {
      dom.className = className;
    }
    const variant = this.__variant;
    addClassNamesToElement(dom, horizontalRuleVariants({ variant }));

    return dom;
  }

  getTextContent(): string {
    return '\n';
  }

  isInline(): false {
    return false;
  }

  updateDOM(prevNode: HorizontalRuleNode): boolean {
    return prevNode.__variant !== this.__variant;
  }

  decorate() {
    return <HorizontalRuleComponent nodeKey={this.__key} />;
  }
}

function convertHorizontalRuleElement(): DOMConversionOutput {
  return { node: $createHorizontalRuleNode() };
}

export function $createHorizontalRuleNode(): HorizontalRuleNode {
  return $applyNodeReplacement(new HorizontalRuleNode());
}

export function $isHorizontalRuleNode(
  node: LexicalNode | null | undefined,
): node is HorizontalRuleNode {
  return node instanceof HorizontalRuleNode;
}
