/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { LexicalNode, NodeKey, SerializedElementNode, SerializedLexicalNode } from 'lexical';

import { $getEditor, $getSelection, ElementNode } from 'lexical';
import { $isPageNode, PageNode } from '@repo/editor/nodes/PageNode';
import { $getPageSetupNode } from '@repo/editor/nodes/PageNode';
import { exportNodeToJSON } from '@repo/editor/utils/editorState';

export type SerializedPageFooterNode = SerializedElementNode;
export type FooterVariant = 'default' | 'first' | 'even';

export class PageFooterNode extends ElementNode {
  __editable = false;
  __checksum: string | null = null;
  static getType(): string {
    return 'page-footer';
  }

  static clone(node: PageFooterNode): PageFooterNode {
    return new PageFooterNode(node.__editable, node.__checksum, node.__key);
  }

  static importJSON(): PageFooterNode {
    return new PageFooterNode(false, null);
  }

  exportJSON(): SerializedPageFooterNode {
    return {
      ...super.exportJSON(),
      type: 'page-footer',
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
    dom.className = 'LexicalTheme__pageFooter';
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
    if (!$isPageNode(parent)) throw new Error('PageFooterNode: Parent is not a PageNode');
    return parent;
  }

  getVariant(): FooterVariant {
    const pageSetupNode = $getPageSetupNode();
    if (!pageSetupNode) throw new Error('PageFooterNode: Could not find page setup');
    const footers = pageSetupNode.getFooters();
    const pageNode = this.getPageNode();
    const pageNumber = pageNode.getPageNumber();
    if (footers.differentFirst && pageNumber === 1) return 'first';
    if (footers.differentEven && pageNumber % 2 === 0) return 'even';
    return 'default';
  }

  updateVariant(): void {
    const variant = this.getVariant();
    const pageSetupNode = $getPageSetupNode();
    if (!pageSetupNode) return;
    const footerNodes = pageSetupNode.getFooterNodes(variant);
    this.clear();
    this.append(...footerNodes);
    const checksum = pageSetupNode.getFooterChecksums()[variant];
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

export function $createPageFooterNode(variant: FooterVariant): PageFooterNode {
  const pageSetupNode = $getPageSetupNode();
  if (!pageSetupNode) throw new Error('PageFooterNode: Could not find page setup');
  const checksum = pageSetupNode.getFooterChecksums()[variant];
  const pageFooterNode = new PageFooterNode(false, checksum);
  const footerNodes = pageSetupNode.getFooterNodes(variant);
  pageFooterNode.append(...footerNodes);
  return pageFooterNode;
}

export function $isPageFooterNode(node: LexicalNode | null | undefined): node is PageFooterNode {
  return node instanceof PageFooterNode;
}
