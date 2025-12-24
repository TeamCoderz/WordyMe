import type {
  DOMConversionOutput,
  LexicalNode,
  SerializedElementNode,
  SerializedLexicalNode,
} from 'lexical';

import { $getEditor, ElementNode } from 'lexical';
import { $isPageNode, PageNode } from '@repo/editor/nodes/PageNode';
import { $getPageSetupNode } from '@repo/editor/nodes/PageNode';
import { exportNodeToJSON } from '@repo/editor/utils/editorState';
import { computeSha256 } from '@repo/shared/checksum';

export type SerializedPageHeaderNode = SerializedElementNode;
export type HeaderVariant = 'default' | 'first' | 'even';

export function $convertPageHeaderElement(): DOMConversionOutput | null {
  const node = $createPageHeaderNode();
  return { node };
}

export class PageHeaderNode extends ElementNode {
  static getType(): string {
    return 'page-header';
  }

  static clone(node: PageHeaderNode): PageHeaderNode {
    return new PageHeaderNode(node.__key);
  }

  static importJSON(): PageHeaderNode {
    return new PageHeaderNode();
  }

  exportJSON(): SerializedPageHeaderNode {
    return {
      ...super.exportJSON(),
      type: 'page-header',
      version: 1,
    };
  }

  createDOM(): HTMLElement {
    const dom = document.createElement('div');
    dom.className = 'LexicalTheme__pageHeader';
    const childrenSize = this.getChildrenSize();
    dom.classList.toggle('hidden', childrenSize === 0);
    dom.setAttribute('contenteditable', 'false');
    dom.onpointerdown = () => {
      dom.removeAttribute('contentEditable');
    };
    return dom;
  }

  updateDOM(_prevNode: this, dom: HTMLElement): boolean {
    const childrenSize = this.getChildrenSize();
    dom.classList.toggle('hidden', childrenSize === 0);
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

export function $createPageHeaderNode(): PageHeaderNode {
  return new PageHeaderNode();
}

export function $isPageHeaderNode(node: LexicalNode | null | undefined): node is PageHeaderNode {
  return node instanceof PageHeaderNode;
}
