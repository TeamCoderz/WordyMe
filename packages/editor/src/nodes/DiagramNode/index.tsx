import { LexicalNode, NodeKey, Spread } from 'lexical';

import { ImageNode, ImagePayload, SerializedImageNode } from '@repo/editor/nodes/ImageNode';

export type DiagramPayload = ImagePayload;

export type SerializedDiagramNode = Spread<
  {
    type: 'diagram';
    version: 1;
  },
  SerializedImageNode
>;

export class DiagramNode extends ImageNode {
  static getType(): string {
    return 'diagram';
  }

  static clone(node: DiagramNode): DiagramNode {
    return new DiagramNode(
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

  static importJSON(serializedNode: SerializedDiagramNode): DiagramNode {
    const { width, height, src, style, id, showCaption, altText } = serializedNode;
    const node = $createDiagramNode({
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
    super(src, altText, width, height, style, id, showCaption, signedUrl, key);
  }

  exportJSON(): SerializedDiagramNode {
    return {
      ...super.exportJSON(),
      type: 'diagram',
      version: 1,
    };
  }
}

export function $createDiagramNode({
  src,
  altText = 'Diagram',
  key,
  width,
  height,
  style,
  id,
  showCaption,
  signedUrl,
}: DiagramPayload): DiagramNode {
  return new DiagramNode(src, altText, width, height, style, id, showCaption, signedUrl, key);
}

export function $isDiagramNode(node: LexicalNode | null | undefined): node is DiagramNode {
  return node instanceof DiagramNode;
}
