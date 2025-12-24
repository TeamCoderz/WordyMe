import {
  DOMExportOutput,
  LexicalNode,
  NodeKey,
  Spread,
  $getRoot,
  LexicalUpdateJSON,
  DecoratorNode,
  SerializedLexicalNode,
  DOMConversionMap,
  $applyNodeReplacement,
} from 'lexical';
import { PageSetup, PageSize, Orientation, HeaderConfig, FooterConfig } from './types';
import { DEFAULT_PAGE_SETUP, EMPTY_PARAGRAPH } from './constants';
import { computeSha256 } from '@repo/shared/checksum';

export type SerializedPageSetupNode = Spread<
  {
    type: 'page-setup';
    version: 1;
  } & PageSetup,
  SerializedLexicalNode
>;

export class PageSetupNode extends DecoratorNode<null> {
  __isPaged: boolean;
  __pageSize: PageSize;
  __orientation: Orientation;
  __margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  __headers: HeaderConfig;
  __footers: FooterConfig;

  static getType(): string {
    return 'page-setup';
  }

  static clone(node: PageSetupNode): PageSetupNode {
    return new PageSetupNode(
      node.__isPaged,
      node.__pageSize,
      node.__orientation,
      node.__margins,
      node.__headers,
      node.__footers,
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedPageSetupNode): PageSetupNode {
    return $createPageSetupNode().updateFromJSON(serializedNode);
  }

  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedPageSetupNode>): this {
    const node = super.updateFromJSON(serializedNode);
    const { isPaged, pageSize, orientation, margins, headers, footers } = serializedNode;
    node.__isPaged = isPaged;
    node.__pageSize = pageSize;
    node.__orientation = orientation;
    node.__margins = margins;
    node.__headers = headers;
    node.__footers = footers;
    return node;
  }

  constructor(
    isPaged: boolean,
    pageSize: PageSize,
    orientation: Orientation,
    margins: { top: number; right: number; bottom: number; left: number },
    headers: HeaderConfig,
    footers: FooterConfig,
    key?: NodeKey,
  ) {
    super(key);
    this.__isPaged = isPaged;
    this.__pageSize = pageSize;
    this.__orientation = orientation;
    this.__margins = margins;
    this.__headers = headers;
    this.__footers = footers;
  }

  createDOM(): HTMLElement {
    const dom = document.createElement('div');
    dom.style.display = 'none';
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute('data-lexical-page-setup')) {
          return null;
        }
        return {
          conversion: () => {
            return {
              node: $createPageSetupNode(),
            };
          },
          priority: 2,
        };
      },
    };
  }

  exportJSON(): SerializedPageSetupNode {
    return {
      ...super.exportJSON(),
      type: 'page-setup',
      version: 1,
      isPaged: this.__isPaged,
      pageSize: this.__pageSize,
      orientation: this.__orientation,
      margins: this.__margins,
      headers: this.__headers,
      footers: this.__footers,
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('div');
    element.setAttribute('data-lexical-page-setup', 'true');
    return { element };
  }

  decorate(): null {
    return null;
  }

  isSelected(): boolean {
    return false;
  }

  isKeyboardSelectable(): boolean {
    return false;
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }

  excludeFromCopy(): boolean {
    return true;
  }

  getPageSetup(): PageSetup {
    return {
      isPaged: this.isPaged(),
      pageSize: this.getPageSize(),
      orientation: this.getOrientation(),
      margins: this.getMargins(),
      headers: this.getHeaders(),
      footers: this.getFooters(),
    };
  }

  isPaged(): boolean {
    const latest = this.getLatest();
    return latest.__isPaged ?? DEFAULT_PAGE_SETUP.isPaged;
  }

  getPageSize(): PageSize {
    const latest = this.getLatest();
    return latest.__pageSize ?? DEFAULT_PAGE_SETUP.pageSize;
  }

  getOrientation(): Orientation {
    const latest = this.getLatest();
    return latest.__orientation ?? DEFAULT_PAGE_SETUP.orientation;
  }

  getMargins(): { top: number; right: number; bottom: number; left: number } {
    const latest = this.getLatest();
    return latest.__margins ?? DEFAULT_PAGE_SETUP.margins;
  }

  getHeaders(): HeaderConfig {
    const latest = this.getLatest();
    return latest.__headers ?? DEFAULT_PAGE_SETUP.headers;
  }

  getFooters(): FooterConfig {
    const latest = this.getLatest();
    return latest.__footers ?? DEFAULT_PAGE_SETUP.footers;
  }

  setIsPaged(isPaged: boolean): void {
    const writable = this.getWritable();
    writable.__isPaged = isPaged;
  }

  setPageSize(pageSize: PageSize): void {
    const writable = this.getWritable();
    writable.__pageSize = pageSize;
  }

  setOrientation(orientation: Orientation): void {
    const writable = this.getWritable();
    writable.__orientation = orientation;
  }

  setMargins(margins: { top: number; right: number; bottom: number; left: number }): void {
    const writable = this.getWritable();
    writable.__margins = margins;
  }

  setHeaders(headers: HeaderConfig): void {
    const writable = this.getWritable();
    writable.__headers = headers;
  }

  setFooters(footers: FooterConfig): void {
    const writable = this.getWritable();
    writable.__footers = footers;
  }

  resetHeaders(): void {
    const writable = this.getWritable();
    writable.__headers = DEFAULT_PAGE_SETUP.headers;
  }

  resetFooters(): void {
    const writable = this.getWritable();
    writable.__footers = DEFAULT_PAGE_SETUP.footers;
  }

  getHeadersChecksum() {
    const headers = this.getHeaders();
    const checksums = {
      default: computeSha256(JSON.stringify(headers.default ?? [EMPTY_PARAGRAPH])),
      first: computeSha256(JSON.stringify(headers.first ?? [EMPTY_PARAGRAPH])),
      even: computeSha256(JSON.stringify(headers.even ?? [EMPTY_PARAGRAPH])),
    };
    return checksums;
  }

  getFootersChecksum() {
    const footers = this.getFooters();
    const checksums = {
      default: computeSha256(JSON.stringify(footers.default ?? [EMPTY_PARAGRAPH])),
      first: computeSha256(JSON.stringify(footers.first ?? [EMPTY_PARAGRAPH])),
      even: computeSha256(JSON.stringify(footers.even ?? [EMPTY_PARAGRAPH])),
    };
    return checksums;
  }
}

export function $createPageSetupNode(payload = DEFAULT_PAGE_SETUP): PageSetupNode {
  const { isPaged, pageSize, orientation, margins, headers, footers } = payload;
  return $applyNodeReplacement(
    new PageSetupNode(isPaged, pageSize, orientation, margins, headers, footers),
  );
}

export function $isPageSetupNode(node: LexicalNode | null | undefined): node is PageSetupNode {
  return node instanceof PageSetupNode;
}

export function $getPageSetupNode(): PageSetupNode | null {
  const root = $getRoot();
  const firstChild = root.getFirstChild();
  if ($isPageSetupNode(firstChild)) {
    return firstChild;
  }
  return null;
}
