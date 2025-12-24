import { LexicalNode, NodeKey, Spread } from 'lexical';

import { ImageNode, ImagePayload, SerializedImageNode } from '@repo/editor/nodes/ImageNode';

export type SketchPayload = ImagePayload;

export type SerializedSketchNode = Spread<
  {
    type: 'sketch';
    version: 1;
  },
  SerializedImageNode
>;

export class SketchNode extends ImageNode {
  static getType(): string {
    return 'sketch';
  }

  static clone(node: SketchNode): SketchNode {
    return new SketchNode(
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

  static importJSON(serializedNode: SerializedSketchNode): SketchNode {
    const { width, height, src, style, id, showCaption, altText } = serializedNode;
    const node = $createSketchNode({
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

  exportJSON(): SerializedSketchNode {
    return {
      ...super.exportJSON(),
      type: 'sketch',
      version: 1,
    };
  }
}

export function $createSketchNode({
  src,
  altText = 'Sketch',
  key,
  width,
  height,
  style,
  id,
  showCaption,
  signedUrl,
}: SketchPayload): SketchNode {
  return new SketchNode(src, altText, width, height, style, id, showCaption, signedUrl, key);
}

export function $isSketchNode(node: LexicalNode | null | undefined): node is SketchNode {
  return node instanceof SketchNode;
}
