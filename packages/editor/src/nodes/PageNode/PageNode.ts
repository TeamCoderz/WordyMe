import type { LexicalNode, SerializedElementNode } from 'lexical';

import { $getEditor, ElementNode, isHTMLElement } from 'lexical';

import { $createPageContentNode, $isPageContentNode, PageContentNode } from './PageContentNode';
import { $createPageFooterNode, $isPageFooterNode, PageFooterNode } from './PageFooterNode';
import { $createPageHeaderNode, $isPageHeaderNode, PageHeaderNode } from './PageHeaderNode';
import { $getPageSetupNode } from './PageSetupNode';

export type SerializedPageNode = SerializedElementNode;

const pagesMarkedForMeasurement = new Set<string>();
const fixedPageHeights = new Map<string, number>();

export class PageNode extends ElementNode {
  static getType(): string {
    return 'page';
  }

  static clone(node: PageNode): PageNode {
    return new PageNode(node.__key);
  }

  static clearMeasurementFlags(): void {
    pagesMarkedForMeasurement.clear();
    fixedPageHeights.clear();
  }

  static clearFixedPages(): void {
    fixedPageHeights.clear();
  }

  static markForMeasurement(nodeKey: string): void {
    pagesMarkedForMeasurement.add(nodeKey);
  }

  static clearMeasurementFlag(nodeKey: string): void {
    pagesMarkedForMeasurement.delete(nodeKey);
  }

  getHeaderNode(): PageHeaderNode {
    const header = this.getChildren().find($isPageHeaderNode);
    if (!header) throw new Error('PageNode: Header node not found');
    return header;
  }

  getContentNode(): PageContentNode {
    const content = this.getChildren().find($isPageContentNode);
    if (!content) throw new Error('PageNode: Content node not found');
    return content;
  }

  getFooterNode(): PageFooterNode {
    const footer = this.getChildren().find($isPageFooterNode);
    if (!footer) throw new Error('PageNode: Footer node not found');
    return footer;
  }

  createDOM(): HTMLElement {
    const dom = document.createElement('div');
    dom.className = 'LexicalTheme__page';
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  static importJSON(): PageNode {
    return new PageNode();
  }

  getTextFormat(): number {
    return 0;
  }

  getTextStyle(): string {
    return '';
  }

  getPageNumber(): number {
    const parent = this.getParent();
    if (parent === null) {
      return -1;
    }
    let node = parent.getFirstChild();
    let index = 0;
    while (node !== null) {
      if (this.is(node)) {
        return index + 1;
      }
      if ($isPageNode(node)) {
        index++;
      }
      node = node.getNextSibling();
    }
    return -1;
  }

  isMarkedForMeasurement(): boolean {
    return pagesMarkedForMeasurement.has(this.getKey());
  }

  markForMeasurement(): void {
    pagesMarkedForMeasurement.add(this.getKey());
  }

  clearMeasurementFlag(): void {
    pagesMarkedForMeasurement.delete(this.getKey());
  }

  getFixedHeight(): number | undefined {
    return fixedPageHeights.get(this.getKey());
  }

  setFixedHeight(height: number): void {
    fixedPageHeights.set(this.getKey(), height);
  }

  getPageElement(): HTMLElement | null {
    const editor = $getEditor();
    return editor.getElementByKey(this.getKey());
  }

  getPageContentElement(): HTMLElement | null {
    const editor = $getEditor();
    return editor.getElementByKey(this.getContentNode().getKey());
  }

  measureHeight(): number {
    this.clearMeasurementFlag();
    const element = this.getPageElement();
    if (!element) return 0;
    element.style.minHeight = 'unset';
    const height = element.scrollHeight;
    element.style.minHeight = '';
    return height;
  }

  getUnderflowingChildren(): LexicalNode[] {
    const editor = $getEditor();
    const rootElement = editor.getRootElement();
    if (!rootElement) return [];
    const pageElement = this.getPageElement();
    if (!pageElement) return [];
    const contentElement = this.getPageContentElement();
    if (!contentElement) return [];
    const nextPage = this.getNextSibling();
    if (!$isPageNode(nextPage)) return [];
    const nextPageContentNode = nextPage.getContentNode();
    if (!nextPageContentNode) return [];
    const nextPageContentChildren = nextPageContentNode.getChildren();
    if (!nextPageContentChildren.length) return [];
    const nextPageContentElement = nextPage.getPageContentElement();
    if (!nextPageContentElement) return [];
    const nextPageChildNodes = Array.from(nextPageContentElement.childNodes);
    pageElement.style.minHeight = 'unset';
    const pageHeight = parseInt(document.documentElement.style.getPropertyValue('--page-height'));
    if (!pageHeight) return [];
    let overflowAfterIndex = 0;
    let currentPageHeight = pageElement.scrollHeight;
    while (currentPageHeight < pageHeight) {
      const nextChild = nextPageChildNodes[overflowAfterIndex]?.cloneNode(true);
      if (!nextChild) break;
      contentElement.appendChild(nextChild);
      currentPageHeight = pageElement.scrollHeight;
      if (currentPageHeight > pageHeight) break;
      overflowAfterIndex++;
      this.setFixedHeight(currentPageHeight);
    }
    pageElement.style.minHeight = '';
    if (overflowAfterIndex === 0) return [];
    return nextPageContentChildren.slice(0, overflowAfterIndex);
  }

  getOverflowingChildren(): LexicalNode[] {
    const editor = $getEditor();
    const rootElement = editor.getRootElement();
    if (!rootElement) return [];
    const pageElement = this.getPageElement();
    if (!pageElement) return [];
    const contentElement = this.getPageContentElement();
    const contentNode = this.getContentNode();
    if (!contentElement || !contentNode) return [];
    const children = contentNode.getChildren();
    const childNodes = Array.from(contentElement.childNodes);
    if (children.length !== childNodes.length) {
      childNodes.forEach((childNode) => childNode.remove());
      contentNode.reconcileObservedMutation(contentElement, editor);
      return this.getOverflowingChildren();
    }
    pageElement.style.minHeight = 'unset';
    const pageHeight = parseInt(document.documentElement.style.getPropertyValue('--page-height'));
    if (!pageHeight) return [];
    let currentPageHeight = pageElement.scrollHeight;
    let overflowAfterIndex = children.length - 1;
    while (currentPageHeight > pageHeight) {
      const lastChild = childNodes[overflowAfterIndex];
      if (lastChild) lastChild.remove();
      currentPageHeight = pageElement.scrollHeight;
      this.setFixedHeight(currentPageHeight);
      if (currentPageHeight < pageHeight) break;
      overflowAfterIndex--;
    }
    pageElement.style.minHeight = '';
    return children.slice(overflowAfterIndex || 1);
  }

  getPreviousPage(): PageNode | null {
    let previousSibling = this.getPreviousSibling();
    while (previousSibling && !$isPageNode(previousSibling)) {
      previousSibling = previousSibling.getPreviousSibling();
    }
    if (!$isPageNode(previousSibling)) return null;
    return previousSibling;
  }

  getNextPage(): PageNode | null {
    let nextSibling = this.getNextSibling();
    while (nextSibling && !$isPageNode(nextSibling)) {
      nextSibling = nextSibling.getNextSibling();
    }
    if (!$isPageNode(nextSibling)) return null;
    return nextSibling;
  }

  fixFlow() {
    if (!this.isAttached()) return this.clearMeasurementFlag();
    const editor = $getEditor();
    const rootElement = editor.getRootElement();
    if (!isHTMLElement(rootElement)) return;
    const pageHeight = parseInt(document.documentElement.style.getPropertyValue('--page-height'));
    const fixedPageHeight = this.getFixedHeight();
    const currentPageHeight = this.measureHeight();
    if (currentPageHeight === fixedPageHeight) return;
    if (!pageHeight || !currentPageHeight) return;
    if (currentPageHeight === 0) return;
    const isOverflowing = currentPageHeight > pageHeight;
    if (isOverflowing) this.fixOverflow();
    else this.fixUnderflow();
  }

  fixOverflow() {
    const contentNode = this.getContentNode();
    const childrenSize = contentNode.getChildrenSize();
    if (childrenSize === 1) return;
    const overflowingChildren = this.getOverflowingChildren();
    if (!overflowingChildren.length) return;
    const nextSibling = this.getNextSibling();
    if ($isPageNode(nextSibling)) {
      const nextContent = nextSibling.getContentNode();
      const nextPageFirstChild = nextContent.getFirstChild();
      if (!nextPageFirstChild) return;
      overflowingChildren.forEach((child: LexicalNode) => {
        nextPageFirstChild.insertBefore(child);
      });
    } else {
      const pageNumber = this.getPageNumber();
      const newPage = $createPageNode(pageNumber + 1);
      newPage.getContentNode().append(...overflowingChildren);
      this.insertAfter(newPage);
    }
  }

  fixUnderflow() {
    const contentNode = this.getContentNode();
    const childrenSize = contentNode.getChildrenSize();
    if (!childrenSize) return this.remove();
    const nextSibling = this.getNextSibling();
    if (!$isPageNode(nextSibling)) return;
    const nextContent = nextSibling.getContentNode();
    const nextPageChildrenSize = nextContent.getChildrenSize();
    if (nextPageChildrenSize === 0) return;
    const underflowingChildren = this.getUnderflowingChildren();
    if (!underflowingChildren.length) return;
    contentNode.append(...underflowingChildren);
    if (nextPageChildrenSize !== underflowingChildren.length) return;
    nextSibling.remove();
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

  exportJSON(): SerializedPageNode {
    return {
      ...super.exportJSON(),
      type: 'page',
      version: 1,
    };
  }
}

export function $createPageNode(pageNumber: number): PageNode {
  const pageSetupNode = $getPageSetupNode();
  if (!pageSetupNode) throw new Error('PageNode: Could not find page setup');
  const headers = pageSetupNode.getHeaders();
  const footers = pageSetupNode.getFooters();
  const headerVariant = headers.differentEven && pageNumber % 2 === 0 ? 'even' : 'default';
  const footerVariant = footers.differentEven && pageNumber % 2 === 0 ? 'even' : 'default';
  return new PageNode().append(
    $createPageHeaderNode(headerVariant),
    $createPageContentNode(),
    $createPageFooterNode(footerVariant),
  );
}

export function $isPageNode(node: LexicalNode | null | undefined): node is PageNode {
  return node instanceof PageNode;
}
