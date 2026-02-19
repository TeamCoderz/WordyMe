/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

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
import { HeaderVariant } from './PageHeaderNode';
import { $generateNodesFromSerializedNodes } from '@lexical/clipboard';
import { FooterVariant } from './PageFooterNode';

export const PAGE_SETUP_TAG = 'page-setup';

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
  __checksums: {
    defaultHeader: string | null;
    defaultFooter: string | null;
    firstHeader: string | null;
    firstFooter: string | null;
    evenHeader: string | null;
    evenFooter: string | null;
  };

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
      node.__checksums,
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedPageSetupNode): PageSetupNode {
    return $createPageSetupNode().updateFromJSON(serializedNode);
  }

  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedPageSetupNode>): this {
    const { isPaged, pageSize, orientation, margins, headers, footers } = serializedNode;
    const node = super.updateFromJSON(serializedNode);
    if (isPaged !== undefined) node.setIsPaged(isPaged);
    if (pageSize !== undefined) node.setPageSize(pageSize);
    if (orientation !== undefined) node.setOrientation(orientation);
    if (margins !== undefined) node.setMargins(margins);
    if (headers !== undefined) node.setHeaders(headers);
    if (footers !== undefined) node.setFooters(footers);
    return node;
  }

  constructor(
    isPaged: boolean,
    pageSize: PageSize,
    orientation: Orientation,
    margins: { top: number; right: number; bottom: number; left: number },
    headers: HeaderConfig,
    footers: FooterConfig,
    checksums: {
      defaultHeader: string | null;
      defaultFooter: string | null;
      firstHeader: string | null;
      firstFooter: string | null;
      evenHeader: string | null;
      evenFooter: string | null;
    },
    key?: NodeKey,
  ) {
    super(key);
    this.__isPaged = isPaged;
    this.__pageSize = pageSize;
    this.__orientation = orientation;
    this.__margins = margins;
    this.__headers = headers;
    this.__footers = footers;
    this.__checksums = checksums;
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
    return latest.__margins ?? structuredClone(DEFAULT_PAGE_SETUP.margins);
  }

  getHeaders(): HeaderConfig {
    const latest = this.getLatest();
    return latest.__headers ?? structuredClone(DEFAULT_PAGE_SETUP.headers);
  }

  getHeaderNodes(variant: HeaderVariant): LexicalNode[] {
    const headers = this.getHeaders();
    const serializedNodes = headers[variant];
    if (!serializedNodes) return [];
    return $generateNodesFromSerializedNodes(serializedNodes);
  }

  getFooters(): FooterConfig {
    const latest = this.getLatest();
    return latest.__footers ?? structuredClone(DEFAULT_PAGE_SETUP.footers);
  }

  getFooterNodes(variant: FooterVariant): LexicalNode[] {
    const footers = this.getFooters();
    const serializedNodes = footers[variant];
    if (!serializedNodes) return [];
    return $generateNodesFromSerializedNodes(serializedNodes);
  }

  setIsPaged(isPaged: boolean) {
    const writable = this.getWritable();
    writable.__isPaged = isPaged;
    return this;
  }

  setPageSize(pageSize: PageSize) {
    const writable = this.getWritable();
    writable.__pageSize = pageSize;
    return this;
  }

  setOrientation(orientation: Orientation) {
    const writable = this.getWritable();
    writable.__orientation = orientation;
    return this;
  }

  setMargins(
    margins: Partial<{
      top: number;
      right: number;
      bottom: number;
      left: number;
    }>,
  ) {
    const writable = this.getWritable();
    if (margins.top !== undefined) {
      writable.__margins.top = margins.top;
    }
    if (margins.right !== undefined) {
      writable.__margins.right = margins.right;
    }
    if (margins.bottom !== undefined) {
      writable.__margins.bottom = margins.bottom;
    }
    if (margins.left !== undefined) {
      writable.__margins.left = margins.left;
    }
    return this;
  }

  setHeaders(headers: Partial<HeaderConfig>) {
    const writable = this.getWritable();
    writable.__headers = { ...this.__headers, ...headers };
    if (headers.default) {
      writable.__checksums.defaultHeader = computeSha256(JSON.stringify(headers.default));
    }
    if (headers.first) {
      writable.__checksums.firstHeader = computeSha256(JSON.stringify(headers.first));
    }
    if (headers.even) {
      writable.__checksums.evenHeader = computeSha256(JSON.stringify(headers.even));
    }
    if (headers.enabled && !this.__headers.default && !headers.default) {
      writable.__headers.default = [EMPTY_PARAGRAPH];
      writable.__checksums.defaultHeader = computeSha256(
        JSON.stringify(writable.__headers.default),
      );
    }
    if (headers.enabled && !this.__headers.first && !headers.first) {
      writable.__headers.first = [EMPTY_PARAGRAPH];
      writable.__checksums.firstHeader = computeSha256(JSON.stringify(writable.__headers.first));
    }
    if (headers.enabled && !this.__headers.even && !headers.even) {
      writable.__headers.even = [EMPTY_PARAGRAPH];
      writable.__checksums.evenHeader = computeSha256(JSON.stringify(writable.__headers.even));
    }
    return this;
  }

  setFooters(footers: Partial<FooterConfig>) {
    const writable = this.getWritable();
    writable.__footers = { ...this.__footers, ...footers };
    if (footers.default) {
      writable.__checksums.defaultFooter = computeSha256(JSON.stringify(footers.default));
    }
    if (footers.first) {
      writable.__checksums.firstFooter = computeSha256(JSON.stringify(footers.first));
    }
    if (footers.even) {
      writable.__checksums.evenFooter = computeSha256(JSON.stringify(footers.even));
    }
    if (footers.enabled && !this.__footers.default && !footers.default) {
      writable.__footers.default = [EMPTY_PARAGRAPH];
      writable.__checksums.defaultFooter = computeSha256(
        JSON.stringify(writable.__footers.default),
      );
    }
    if (footers.enabled && !this.__footers.first && !footers.first) {
      writable.__footers.first = [EMPTY_PARAGRAPH];
      writable.__checksums.firstFooter = computeSha256(JSON.stringify(writable.__footers.first));
    }
    if (footers.enabled && !this.__footers.even && !footers.even) {
      writable.__footers.even = [EMPTY_PARAGRAPH];
      writable.__checksums.evenFooter = computeSha256(JSON.stringify(writable.__footers.even));
    }
    return this;
  }

  resetHeaders(): void {
    const writable = this.getWritable();
    writable.__headers = DEFAULT_PAGE_SETUP.headers;
  }

  resetFooters(): void {
    const writable = this.getWritable();
    writable.__footers = DEFAULT_PAGE_SETUP.footers;
  }

  getHeaderChecksums() {
    return {
      default: this.__checksums.defaultHeader,
      first: this.__checksums.firstHeader,
      even: this.__checksums.evenHeader,
    };
  }

  getFooterChecksums() {
    return {
      default: this.__checksums.defaultFooter,
      first: this.__checksums.firstFooter,
      even: this.__checksums.evenFooter,
    };
  }
}

export function $createPageSetupNode(payload = structuredClone(DEFAULT_PAGE_SETUP)): PageSetupNode {
  const { isPaged, pageSize, orientation, margins, headers, footers } = payload;
  const checksums = {
    defaultHeader: null,
    defaultFooter: null,
    firstHeader: null,
    firstFooter: null,
    evenHeader: null,
    evenFooter: null,
  };
  return $applyNodeReplacement(
    new PageSetupNode(isPaged, pageSize, orientation, margins, headers, footers, checksums),
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
