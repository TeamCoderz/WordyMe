import type {
  DOMConversionOutput,
  LexicalNode,
  SerializedElementNode,
  SerializedLexicalNode,
} from 'lexical';

import { $getEditor, ElementNode } from 'lexical';
import { $isPageNode, PageNode } from '@repo/editor/nodes/PageNode';
import { $getPageSetupNode } from '@repo/editor/nodes/PageNode';
import { computeSha256 } from '@repo/shared/checksum';
import { exportNodeToJSON } from '@repo/editor/utils/editorState';

export type SerializedPageFooterNode = SerializedElementNode;
export type FooterVariant = 'default' | 'first' | 'even';

export function $convertPageFooterElement(): DOMConversionOutput | null {
  const node = $createPageFooterNode();
  return { node };
}

export class PageFooterNode extends ElementNode {
  static getType(): string {
    return 'page-footer';
  }

  static clone(node: PageFooterNode): PageFooterNode {
    return new PageFooterNode(node.__key);
  }

  static importJSON(): PageFooterNode {
    return new PageFooterNode();
  }

  exportJSON(): SerializedPageFooterNode {
    return {
      ...super.exportJSON(),
      type: 'page-footer',
      version: 1,
    };
  }

  createDOM(): HTMLElement {
    const dom = document.createElement('div');
    dom.className = 'LexicalTheme__pageFooter';
    const childrenSize = this.getChildrenSize();
    dom.classList.toggle('hidden', childrenSize === 0);
    dom.contentEditable = 'false';
    dom.onpointerdown = () => {
      dom.removeAttribute('contentEditable');
    };
    return dom;
  }

  updateDOM(_prevNode: this, dom: HTMLElement): boolean {
    const childrenSize = this.getChildrenSize();
    dom.classList.toggle('hidden', childrenSize === 0);
    dom.contentEditable = 'false';
    return false;
  }

  getTextFormat(): number {
    return 0;
  }

  getTextStyle(): string {
    return '';
  }

  setEditable(editable: boolean): void {
    const dom = $getEditor().getElementByKey(this.getKey());
    if (!dom) return;
    if (editable) dom.removeAttribute('contentEditable');
    else dom.setAttribute('contenteditable', 'false');
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

  getSerializedChildren(): SerializedLexicalNode[] {
    return exportNodeToJSON<SerializedElementNode>(this).children;
  }

  getChecksum(): string {
    const serializedNodes = this.getSerializedChildren();
    return computeSha256(JSON.stringify(serializedNodes));
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
    return true;
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }
}

export function $createPageFooterNode(): PageFooterNode {
  return new PageFooterNode();
}

export function $isPageFooterNode(node: LexicalNode | null | undefined): node is PageFooterNode {
  return node instanceof PageFooterNode;
}
