/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  HeadingTagType,
  HeadingNode as LexicalHeadingNode,
  SerializedHeadingNode as LexicalSerializedHeadingNode,
} from '@lexical/rich-text';

import type {
  DOMConversionMap,
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  LexicalUpdateJSON,
  NodeKey,
} from 'lexical';

import { isHTMLElement } from '@lexical/utils';
import { $applyNodeReplacement } from 'lexical';
import { formatId } from '@repo/lib/utils/id';
export type SerializedHeadingNode = LexicalSerializedHeadingNode & {
  id: string;
};

export { HeadingNode as LexicalHeadingNode } from '@lexical/rich-text';

/** @noInheritDoc */
export class HeadingNode extends LexicalHeadingNode {
  __id: string;
  static getType(): string {
    return 'wordy-heading';
  }

  constructor(headingTag: HeadingTagType, key?: NodeKey) {
    super(headingTag, key);
    this.__id = '';
  }

  static clone(node: HeadingNode): HeadingNode {
    const headingNode = new HeadingNode(node.__tag, node.__key);
    headingNode.__id = node.__id;
    return headingNode;
  }

  static importJSON(serializedNode: SerializedHeadingNode): HeadingNode {
    return $createHeadingNode().updateFromJSON(serializedNode);
  }

  static importDOM(): DOMConversionMap | null {
    return LexicalHeadingNode.importDOM();
  }

  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedHeadingNode>): this {
    return super.updateFromJSON(serializedNode).setId(serializedNode.id);
  }

  exportJSON(): SerializedHeadingNode {
    return {
      ...super.exportJSON(),
      id: this.__id,
      type: HeadingNode.getType(),
    };
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    if (this.__id) dom.id = this.__id;
    else dom.id = formatId(this.getTextContent());
    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    const prevId = prevNode.getId();
    const id = this.getId();
    if (prevId !== id) dom.id = id;
    else if (!id) dom.id = formatId(this.getTextContent());
    return super.updateDOM(prevNode, dom, config);
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const output = super.exportDOM(editor);
    const element = output.element;
    if (!isHTMLElement(element)) {
      return output;
    }
    const id = this.getId();
    if (id) element.id = id;
    else element.id = formatId(this.getTextContent());
    const direction = this.getDirection();
    element.dir = direction ?? 'auto';
    return output;
  }

  getId(): string {
    const self = this.getLatest();
    return self.__id;
  }

  setId(id: string): this {
    const self = this.getWritable();
    self.__id = id;
    return self;
  }
}

export function $createHeadingNode(headingTag: HeadingTagType = 'h1'): HeadingNode {
  return $applyNodeReplacement(new HeadingNode(headingTag));
}

export function $isHeadingNode(node: LexicalNode | null | undefined): node is HeadingNode {
  return node instanceof HeadingNode;
}
