/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  Spread,
} from 'lexical';

import { ImageNode, ImagePayload, SerializedImageNode } from '@repo/editor/nodes/ImageNode';

function convertIFrameElement(domNode: HTMLElement): null | DOMConversionOutput {
  const src = domNode.getAttribute('data-lexical-iFrame');
  if (src) {
    const width = +(domNode.getAttribute('width') || '560');
    const height = +(domNode.getAttribute('height') || '315');
    const style = domNode.style.cssText;
    const altText = domNode.title;
    const id = domNode.id;
    const node = $createIFrameNode({ src, width, height, style, id, altText });
    return { node };
  }
  return null;
}

export type IFramePayload = ImagePayload;
export type SerializedIFrameNode = Spread<
  {
    type: 'iframe';
    version: 1;
  },
  SerializedImageNode
>;

export class IFrameNode extends ImageNode {
  static getType(): string {
    return 'iframe';
  }

  static clone(node: IFrameNode): IFrameNode {
    return new IFrameNode(
      node.__src,
      node.__altText,
      node.__width,
      node.__height,
      node.__style,
      node.__id,
      node.__showCaption,
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedIFrameNode): IFrameNode {
    const { width, height, src, style, id, showCaption, altText } = serializedNode;
    const node = $createIFrameNode({
      src,
      width,
      height,
      style,
      id,
      showCaption,
      altText,
    });
    return node;
  }

  exportJSON(): SerializedIFrameNode {
    return {
      ...super.exportJSON(),
      type: 'iframe',
      version: 1,
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
    key?: NodeKey,
  ) {
    super(src, altText, width, height, style, id, showCaption, undefined, key);
  }

  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement {
    const element = super.createDOM(config, editor);
    if (!element) return element;
    const isEditable = editor.isEditable();
    const iframe = document.createElement('iframe');
    iframe.setAttribute('data-lexical-iFrame', this.__src);
    if (this.__width) iframe.setAttribute('width', this.__width.toString());
    if (this.__height) iframe.setAttribute('height', this.__height.toString());
    iframe.setAttribute('style', `anchor-name: --image-anchor-${this.__key};`);
    const matchYoutube = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/.exec(
      this.__src,
    );
    const videoId = matchYoutube
      ? matchYoutube?.[2].length === 11
        ? matchYoutube[2]
        : null
      : null;
    iframe.setAttribute(
      'src',
      videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : this.__src,
    );
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute(
      'allow',
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
    );
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.setAttribute('title', this.__altText);
    if (isEditable) {
      element.onclick = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (target.tagName !== 'FIGURE') return;
        editor.update(() => {
          this.selectEnd();
        });
      };
      element.classList.add('cursor-pointer');
      iframe.style.pointerEvents = 'none';
    }
    element.firstChild!.replaceWith(iframe);
    return element;
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const output = super.exportDOM(editor);
    const element = output.element;
    if (!element) return output;
    const iframe = document.createElement('iframe');
    iframe.setAttribute('data-lexical-iFrame', this.__src);
    if (this.__width) iframe.setAttribute('width', this.__width.toString());
    if (this.__height) iframe.setAttribute('height', this.__height.toString());
    const matchYoutube = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/.exec(
      this.__src,
    );
    const videoId = matchYoutube
      ? matchYoutube?.[2].length === 11
        ? matchYoutube[2]
        : null
      : null;
    iframe.setAttribute(
      'src',
      videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : this.__src,
    );
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute(
      'allow',
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
    );
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.setAttribute('title', this.__altText);
    element.firstChild!.replaceWith(iframe);
    return output;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      iframe: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute('data-lexical-iFrame')) {
          return null;
        }
        return {
          conversion: convertIFrameElement,
          priority: 1,
        };
      },
    };
  }

  getTextContent(): string {
    return this.__src;
  }
}

export function $createIFrameNode(payload: IFramePayload): IFrameNode {
  const { src, altText = 'iframe', width, height, style, id, showCaption, key } = payload;
  return new IFrameNode(src, altText, width, height, style, id, showCaption, key);
}

export function $isIFrameNode(
  node: IFrameNode | LexicalNode | null | undefined,
): node is IFrameNode {
  return node instanceof IFrameNode;
}
