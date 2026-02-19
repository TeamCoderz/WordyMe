/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  BaseSelection,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  ElementDOMSlot,
  ElementNode,
  isHTMLElement,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedElementNode,
  Spread,
} from 'lexical';
import { floatWrapperElement, getStyleObjectFromRawCSS } from '@repo/editor/utils/nodeUtils';
import { cn } from '@repo/ui/lib/utils';

export interface ImagePayload {
  altText?: string;
  height: number;
  key?: NodeKey;
  src: string;
  width: number;
  style: string;
  id: string;
  showCaption?: boolean;
  signedUrl?: string;
}

export const signedUrlMap = new Map<string, string | undefined>();

function convertImageElement(domNode: Node): null | DOMConversionOutput {
  const img = domNode as HTMLImageElement;
  if (img.src.startsWith('file:///')) {
    return null;
  }
  const { alt: altText, src, width, height, id } = img;
  const style = '';
  const node = $createImageNode({ altText, height, src, width, id, style });
  return { node };
}

export type SerializedImageNode = Spread<
  {
    altText: string;
    height: number;
    src: string;
    width: number;
    style: string;
    id: string;
    showCaption: boolean;
  },
  SerializedElementNode
>;

export class ImageNode extends ElementNode {
  __src: string;
  __altText: string;
  __width: number;
  __height: number;
  __style: string;
  __id: string;
  __showCaption: boolean;
  __signedUrl?: string;

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__width,
      node.__height,
      node.__style,
      node.__id,
      node.__showCaption,
      node.__signedUrl,
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { altText, height, width, src, style, showCaption, id } = serializedNode;
    const node = $createImageNode({
      altText,
      height,
      src,
      width,
      style,
      id,
      showCaption,
    });

    return node;
  }
  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({
        conversion: convertImageElement,
        priority: 0,
      }),
    };
  }

  constructor(
    src: string,
    altText: string,
    width: number,
    height: number,
    style: string,
    id: string,
    showCaption?: boolean,
    signedUrl?: string,
    key?: NodeKey,
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__width = width;
    this.__height = height;
    this.__style = style;
    this.__id = id;
    this.__showCaption = !!showCaption;
    this.__signedUrl = signedUrl;
  }

  exportJSON(): SerializedImageNode {
    return {
      ...super.exportJSON(),
      type: 'image',
      style: this.__style,
      src: this.__src,
      altText: this.__altText,
      width: this.__width,
      height: this.__height,
      id: this.__id,
      showCaption: this.__showCaption,
    };
  }

  getId(): string {
    return this.__id;
  }

  setId(id: string): void {
    const writable = this.getWritable();
    writable.__id = id;
  }

  getWidth(): number {
    return this.__width;
  }

  getHeight(): number {
    return this.__height;
  }

  setWidthAndHeight(width: number, height: number): void {
    const writable = this.getWritable();
    writable.__width = width;
    writable.__height = height;
  }

  setSrc(src: string): void {
    const writable = this.getWritable();
    writable.__src = src;
  }

  getStyle(): string {
    return this.__style;
  }

  setStyle(style: string): this {
    const self = this.getWritable();
    self.__style = style;
    return self;
  }

  getShowCaption(): boolean {
    return this.__showCaption;
  }

  setShowCaption(showCaption: boolean): this {
    const self = this.getWritable();
    self.__showCaption = showCaption;
    return self;
  }

  update(payload: ImagePayload): void {
    const writable = this.getWritable();
    writable.__src = payload.src;
    writable.__altText = payload.altText ?? writable.__altText;
    writable.__width = payload.width;
    writable.__height = payload.height;
    writable.__style = payload.style;
    writable.__id = payload.id;
    writable.__signedUrl = payload.signedUrl;
    writable.__showCaption = payload.showCaption ?? writable.__showCaption;
  }

  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement {
    const isEditable = editor.isEditable();
    const figure = document.createElement('figure');
    const theme = config.theme;
    const className = theme.image;
    figure.className = cn(className);
    if (isEditable) figure.contentEditable = 'false';

    // Add image element
    const img = document.createElement('img');
    const signedUrl = this.getSignedUrl();

    if (signedUrl) {
      img.src = signedUrl;
    } else if (this.__src.startsWith('/images/')) {
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    } else {
      img.src = this.__src;
    }
    img.alt = this.__altText;
    if (this.__width) img.width = this.__width;
    if (this.__height) img.height = this.__height;
    img.setAttribute(
      'style',
      `anchor-name: --image-anchor-${this.__key};
      ${this.__width && this.__height ? `aspect-ratio: ${this.__width} / ${this.__height};` : ''}
    `,
    );
    img.className = cn({
      'cursor-pointer': isEditable,
      'cursor-zoom-in': !isEditable,
    });
    img.draggable = isEditable;

    if (isEditable) {
      img.onclick = () =>
        editor.update(() => {
          this.selectEnd();
        });
    }
    // Handle styles
    const style = getStyleObjectFromRawCSS(this.__style);
    const float = style.float;
    floatWrapperElement(figure, config, float);

    // Dark mode filter
    const filter = style.filter;
    const isFiltered = filter === 'auto';
    figure.classList.toggle(config.theme.darkModeFilter, isFiltered);

    if (this.__id) figure.id = this.__id;

    figure.appendChild(img);

    // Add figcaption element that will contain children
    const figcaption = document.createElement('figcaption');
    figcaption.className = cn('outline-none', { hidden: !this.__showCaption });
    if (isEditable) figcaption.contentEditable = 'true';
    figure.appendChild(figcaption);

    return figure;
  }

  getDOMSlot(element: HTMLElement): ElementDOMSlot<HTMLElement> {
    return super.getDOMSlot(element).withElement(element.querySelector('figcaption')!);
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const output = super.exportDOM(editor);
    const element = output.element;
    if (!isHTMLElement(element)) {
      return output;
    }
    return {
      element,
      after: (element) => {
        if (output.after) {
          element = output.after(element);
        }
        if (!isHTMLElement(element)) {
          return null;
        }
        const figcaption = element.querySelector('figcaption');
        if (figcaption) {
          const nextSiblings = element.querySelectorAll('figcaption + *');
          figcaption.append(...Array.from(nextSiblings));
        }
        return element;
      },
    };
  }

  updateDOM(prevNode: ImageNode): boolean {
    return (
      this.__src !== prevNode.__src ||
      this.__altText !== prevNode.__altText ||
      this.__width !== prevNode.__width ||
      this.__height !== prevNode.__height ||
      this.__style !== prevNode.__style ||
      this.__id !== prevNode.__id ||
      this.__showCaption !== prevNode.__showCaption ||
      this.__signedUrl !== prevNode.__signedUrl
    );
  }

  getSrc() {
    return this.__src;
  }

  getAltText() {
    return this.__altText;
  }

  getSignedUrl() {
    const cachedSignedUrl = signedUrlMap.get(this.__src);
    if (cachedSignedUrl) {
      return cachedSignedUrl;
    } else if (this.__signedUrl) {
      signedUrlMap.set(this.__src, this.__signedUrl);
    }
    return this.__signedUrl;
  }

  setSignedUrl(signedUrl: string | undefined) {
    signedUrlMap.set(this.__src, signedUrl);
    const writable = this.getWritable();
    writable.__signedUrl = signedUrl;
  }

  canInsertTextBefore(): boolean {
    if (typeof window === 'undefined') return false;
    const nativeSelection = window.getSelection();
    if (!nativeSelection) return false;
    const anchorNode = nativeSelection.anchorNode;
    if (!anchorNode) return false;
    return anchorNode.nodeType === Node.TEXT_NODE || anchorNode.nodeName === 'FIGCAPTION';
  }

  canInsertTextAfter(): boolean {
    if (typeof window === 'undefined') return false;
    const nativeSelection = window.getSelection();
    if (!nativeSelection) return false;
    const anchorNode = nativeSelection.anchorNode;
    if (!anchorNode) return false;
    return anchorNode.nodeType === Node.TEXT_NODE || anchorNode.nodeName === 'FIGCAPTION';
  }

  isShadowRoot(): boolean {
    return false;
  }

  isInline(): boolean {
    return true;
  }

  isSelected(selection?: null | BaseSelection): boolean {
    const isSelected = super.isSelected(selection);
    if (isSelected) return true;
    if (!selection) return false;
    return selection.getNodes().every((n) => this.is(n.getParent()));
  }
}

export function $createImageNode({
  altText = 'Image',
  height,
  src,
  width,
  style,
  id,
  showCaption,
  signedUrl,
  key,
}: ImagePayload): ImageNode {
  const image = new ImageNode(src, altText, width, height, style, id, showCaption, signedUrl, key);
  if (signedUrl) signedUrlMap.set(src, signedUrl);
  if (signedUrl) signedUrlMap.set(src, signedUrl);

  return image;
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode;
}
