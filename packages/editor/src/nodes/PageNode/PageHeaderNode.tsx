/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { LexicalNode, NodeKey, SerializedElementNode, SerializedLexicalNode } from 'lexical';

import { $getEditor, $getSelection, ElementNode } from 'lexical';
import { $isPageNode, PageNode } from '@repo/editor/nodes/PageNode';
import { $getPageSetupNode } from '@repo/editor/nodes/PageNode';
import { exportNodeToJSON } from '@repo/editor/utils/editorState';

export type SerializedPageHeaderNode = SerializedElementNode;
export type HeaderVariant = 'default' | 'first' | 'even';

export class PageHeaderNode extends ElementNode {
  __editable = false;
  __checksum: string | null = null;
  static getType(): string {
    return 'page-header';
  }

  static clone(node: PageHeaderNode): PageHeaderNode {
    return new PageHeaderNode(node.__editable, node.__checksum, node.__key);
  }

  static importJSON(): PageHeaderNode {
    return new PageHeaderNode(false, null);
  }

  exportJSON(): SerializedPageHeaderNode {
    return {
      ...super.exportJSON(),
      type: 'page-header',
      version: 1,
    };
  }

  constructor(editable: boolean, checksum: string | null, key?: NodeKey) {
    super(key);
    this.__editable = editable;
    this.__checksum = checksum;
  }

  createDOM(): HTMLElement {
    const dom = document.createElement('div');
    dom.className = 'LexicalTheme__pageHeader';
    const childrenSize = this.getChildrenSize();
    dom.classList.toggle('hidden', childrenSize === 0);
    const editable = this.getEditable();
    if (editable) dom.removeAttribute('contentEditable');
    else dom.setAttribute('contenteditable', 'false');
    dom.onpointerdown = () => {
      dom.removeAttribute('contentEditable');
    };
    return dom;
  }

  updateDOM(_prevNode: this, dom: HTMLElement): boolean {
    const childrenSize = this.getChildrenSize();
    dom.classList.toggle('hidden', childrenSize === 0);
    const editable = this.getEditable();
    if (editable) dom.removeAttribute('contentEditable');
    else dom.setAttribute('contenteditable', 'false');
    return false;
  }

  getTextFormat(): number {
    return 0;
  }

  getTextStyle(): string {
    return '';
  }

  getEditable(): boolean {
    return this.__editable;
  }

  setEditable(editable: boolean): void {
    const writable = this.getWritable();
    writable.__editable = editable;
  }

  show(): void {
    const dom = $getEditor().getElementByKey(this.getKey());
    if (!dom) return;
    dom.style.display = '';
  }

  hide(): void {
    const dom = $getEditor().getElementByKey(this.getKey());
    if (!dom) return;
    dom.style.display = 'none';
  }

  getPageNode(): PageNode {
    const parent = this.getParent();
    if (!$isPageNode(parent)) throw new Error('PageHeaderNode: Parent is not a PageNode');
    return parent;
  }

  getVariant(): HeaderVariant {
    const pageSetupNode = $getPageSetupNode();
    if (!pageSetupNode) throw new Error('PageHeaderNode: Could not find page setup');
    const headers = pageSetupNode.getHeaders();
    const pageNode = this.getPageNode();
    const pageNumber = pageNode.getPageNumber();
    if (headers.differentFirst && pageNumber === 1) return 'first';
    if (headers.differentEven && pageNumber % 2 === 0) return 'even';
    return 'default';
  }

  updateVariant(): void {
    const variant = this.getVariant();
    const pageSetupNode = $getPageSetupNode();
    if (!pageSetupNode) return;
    const headerNodes = pageSetupNode.getHeaderNodes(variant);
    this.clear();
    this.append(...headerNodes);
    const checksum = pageSetupNode.getHeaderChecksums()[variant];
    this.setChecksum(checksum);
  }

  getSerializedChildren(): SerializedLexicalNode[] {
    return exportNodeToJSON<SerializedElementNode>(this).children;
  }

  getChecksum(): string | null {
    return this.__checksum;
  }

  setChecksum(checksum: string | null): void {
    const writable = this.getWritable();
    writable.__checksum = checksum;
  }

  isShadowRoot(): boolean {
    return true;
  }

  excludeFromCopy(destination?: 'clone' | 'html'): boolean {
    if (destination === 'clone') return true;
    try {
      return $getEditor().isEditable();
    } catch {
      return false;
    }
  }

  excludeChildrenFromCopy(): boolean {
    const editable = this.getEditable();
    if (!editable) return true;
    const selection = $getSelection();
    if (!selection || selection.isCollapsed()) return true;
    return false;
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }
}

export function $createPageHeaderNode(variant: HeaderVariant): PageHeaderNode {
  const pageSetupNode = $getPageSetupNode();
  if (!pageSetupNode) throw new Error('PageHeaderNode: Could not find page setup');
  const headerNodes = pageSetupNode.getHeaderNodes(variant);
  const checksum = pageSetupNode.getHeaderChecksums()[variant];
  const pageHeaderNode = new PageHeaderNode(false, checksum);
  pageHeaderNode.append(...headerNodes);
  return pageHeaderNode;
}

export function $isPageHeaderNode(node: LexicalNode | null | undefined): node is PageHeaderNode {
  return node instanceof PageHeaderNode;
}
