import type { JSX } from 'react';
import AttachmentComponent from './AttachmentComponent';
import { AttachmentCard } from '@repo/editor/components/AttachmentCard';

import {
  DecoratorNode,
  DOMConversionOutput,
  DOMExportOutput,
  LexicalNode,
  SerializedLexicalNode,
  Spread,
  NodeKey,
  DOMConversionMap,
  LexicalEditor,
  isHTMLElement,
} from 'lexical';
import { renderToString } from 'react-dom/server';

export type SerializedAttachmentNode = Spread<
  {
    name: string;
    size: number;
    url: string;
  },
  SerializedLexicalNode
>;

export interface AttachmentPayload {
  name: string;
  size: number;
  url: string;
  signedUrl?: string;
}

function $convertAttachmentElement(domNode: HTMLSpanElement): DOMConversionOutput | null {
  const name = domNode.getAttribute('data-lexical-attachment-name');
  const size = domNode.getAttribute('data-lexical-attachment-size');
  const url = domNode.getAttribute('data-lexical-attachment-url');
  const payload: AttachmentPayload = {
    name: name ?? '',
    size: parseInt(size ?? '0'),
    url: url ?? '',
  };
  const node = $createAttachmentNode(payload);
  return { node };
}

export const signedUrlMap = new Map<string, string | undefined>();

export class AttachmentNode extends DecoratorNode<JSX.Element> {
  __name: string;
  __size: number;
  __url: string;
  __signedUrl?: string;

  constructor(name: string, size: number, url: string, signedUrl?: string, key?: NodeKey) {
    super(key);
    this.__name = name;
    this.__size = size;
    this.__url = url;
    this.__signedUrl = signedUrl;
  }

  static getType(): string {
    return 'attachment';
  }

  static clone(node: AttachmentNode): AttachmentNode {
    return new AttachmentNode(node.__name, node.__size, node.__url, node.__signedUrl, node.__key);
  }

  static importJSON(serializedNode: SerializedAttachmentNode): AttachmentNode {
    const node = $createAttachmentNode({
      name: serializedNode.name,
      size: serializedNode.size,
      url: serializedNode.url,
    });
    return node;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute('data-lexical-attachment')) {
          return null;
        }
        return {
          conversion: $convertAttachmentElement,
          priority: 1,
        };
      },
    };
  }

  exportJSON(): SerializedAttachmentNode {
    return {
      name: this.getName(),
      size: this.getSize(),
      url: this.getUrl(),
      type: 'attachment',
      version: 1,
    };
  }

  getName(): string {
    return this.__name;
  }

  getSize(): number {
    return this.__size;
  }

  getUrl(): string {
    return this.__url;
  }

  getSignedUrl() {
    const cachedSignedUrl = signedUrlMap.get(this.__url);
    if (cachedSignedUrl) {
      return cachedSignedUrl;
    } else if (this.__signedUrl) {
      signedUrlMap.set(this.__url, this.__signedUrl);
    }
    return this.__signedUrl;
  }

  setname(name: string): this {
    const writable = this.getWritable();
    writable.__name = name;
    return writable;
  }

  setSize(size: number): this {
    const writable = this.getWritable();
    writable.__size = size;
    return writable;
  }

  setUrl(url: string): this {
    const writable = this.getWritable();
    writable.__url = url;
    return writable;
  }

  setSignedUrl(signedUrl: string): this {
    signedUrlMap.set(this.__url, signedUrl);
    const writable = this.getWritable();
    writable.__signedUrl = signedUrl;
    return writable;
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const { element } = super.exportDOM(editor);
    if (!element || !isHTMLElement(element)) {
      return { element: null };
    }
    element.innerHTML = renderToString(
      <AttachmentCard
        name={this.getName()}
        size={this.getSize()}
        url={this.getUrl()}
        signedUrl={this.getSignedUrl()}
        className="select-auto"
      />,
    );
    return { element };
  }

  update(payload: AttachmentPayload): void {
    const writable = this.getWritable();
    writable.__name = payload.name;
    writable.__size = payload.size;
    writable.__url = payload.url;
    writable.__signedUrl = payload.signedUrl;
  }

  createDOM(): HTMLElement {
    const element = document.createElement('div');
    element.className = 'LexicalTheme__attachment';
    element.style.display = 'inline-flex ';
    element.setAttribute('data-lexical-attachment', '');
    return element;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): JSX.Element {
    return (
      <AttachmentComponent
        nodeKey={this.getKey()}
        name={this.getName()}
        size={this.getSize()}
        url={this.getUrl()}
        signedUrl={this.getSignedUrl()}
      />
    );
  }
}

export function $createAttachmentNode({
  name,
  size,
  url,
  signedUrl,
}: AttachmentPayload): AttachmentNode {
  return new AttachmentNode(name, size, url, signedUrl);
}

export function $isAttachmentNode(node: LexicalNode | null | undefined): node is AttachmentNode {
  return node instanceof AttachmentNode;
}
