import {
  TextNode,
  NodeKey,
  LexicalNode,
  SerializedTextNode,
  Spread,
  DOMConversionMap,
  DOMExportOutput,
  LexicalUpdateJSON,
  $applyNodeReplacement,
  EditorConfig,
  $getRoot,
} from 'lexical';
import { $isPageNode, PageNode } from './PageNode';
import { $getNearestNodeOfType } from '@lexical/utils';

export type PageNumberVariant = 'current' | 'total';

export type SerializedPageNumberNode = Spread<
  {
    type: 'page-number';
    variant: PageNumberVariant;
  },
  SerializedTextNode
>;

export class PageNumberNode extends TextNode {
  __variant: PageNumberVariant;

  static getType(): string {
    return 'page-number';
  }

  static clone(node: PageNumberNode): PageNumberNode {
    return new PageNumberNode(node.__variant, node.__text, node.__key);
  }

  constructor(variant: PageNumberVariant, text?: string, key?: NodeKey) {
    super(text, key);
    this.__variant = variant;
  }

  static importJSON(serializedNode: SerializedPageNumberNode): PageNumberNode {
    return $createPageNumberNode(serializedNode.variant, serializedNode.text).updateFromJSON(
      serializedNode,
    );
  }

  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedPageNumberNode>): this {
    return super.updateFromJSON(serializedNode);
  }

  exportJSON(): SerializedPageNumberNode {
    return {
      ...super.exportJSON(),
      type: 'page-number',
      variant: this.__variant,
      text: '',
    };
  }

  getVariant(): PageNumberVariant {
    return this.getLatest().__variant;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    const isUpdated = super.updateDOM(prevNode, dom, config);
    if (prevNode.__variant !== this.__variant) {
      dom.setAttribute('data-lexical-page-number', this.__variant);
    }
    return isUpdated;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (domNode: HTMLElement) => {
        const variant = domNode.getAttribute('data-lexical-page-number');
        if (!variant) return null;
        return {
          conversion: () => ({
            node: $createPageNumberNode(variant as PageNumberVariant),
          }),
          priority: 2,
        };
      },
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('span');
    element.setAttribute('data-lexical-page-number', this.__variant);
    return { element };
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }

  getTotalPages(): number {
    const root = $getRoot();
    const pages = root.getChildren().filter($isPageNode);
    return pages.length;
  }

  getPageNumber(): number {
    const pageNode = $getNearestNodeOfType(this, PageNode);
    if (!pageNode) return 0;
    return pageNode.getPageNumber();
  }
}

export function $createPageNumberNode(variant: PageNumberVariant, text?: string): PageNumberNode {
  return $applyNodeReplacement(new PageNumberNode(variant, text).setMode('token'));
}

export function $isPageNumberNode(node: LexicalNode | null | undefined): node is PageNumberNode {
  return node instanceof PageNumberNode;
}
