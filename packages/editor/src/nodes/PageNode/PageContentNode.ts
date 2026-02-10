import type { LexicalNode, SerializedElementNode } from 'lexical';

import { $getEditor, ElementNode } from 'lexical';
import { $isPageNode, PageNode } from './PageNode';

export type SerializedPageContentNode = SerializedElementNode;
export class PageContentNode extends ElementNode {
  static getType(): string {
    return 'page-content';
  }

  static clone(node: PageContentNode): PageContentNode {
    return new PageContentNode(node.__key);
  }

  createDOM(): HTMLElement {
    const dom = document.createElement('div');
    dom.className = 'LexicalTheme__pageContent';
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  static importJSON(): PageContentNode {
    return new PageContentNode();
  }

  getPageNode(): PageNode {
    const parent = this.getParent();
    if (!$isPageNode(parent)) throw new Error('PageContentNode: Parent is not a PageNode');
    return parent;
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

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }

  exportJSON(): SerializedPageContentNode {
    return {
      ...super.exportJSON(),
      type: 'page-content',
      version: 1,
    };
  }

  getTextFormat(): number {
    return 0;
  }

  getTextStyle(): string {
    return '';
  }
}

export function $createPageContentNode(): PageContentNode {
  return new PageContentNode();
}

export function $isPageContentNode(node: LexicalNode | null | undefined): node is PageContentNode {
  return node instanceof PageContentNode;
}
