import {
  LexicalNode,
  NodeKey,
  Spread,
  EditorConfig,
  LexicalEditor,
  DOMExportOutput,
  DOMConversionMap,
} from 'lexical';
import { isHTMLElement } from 'lexical';

import { ImageNode, ImagePayload, SerializedImageNode } from '@repo/editor/nodes/ImageNode';
import { signedUrlMap } from '@repo/editor/nodes/AttachmentNode';

export type ScorePayload = Readonly<
  ImagePayload & {
    attachmentUrl: string;
    attachmentSignedUrl?: string;
  }
>;

export type SerializedScoreNode = Spread<
  {
    type: 'score';
    version: 1;
    attachmentUrl: string;
  },
  SerializedImageNode
>;

export class ScoreNode extends ImageNode {
  __attachmentUrl: string;
  __attachmentSignedUrl?: string;

  static getType(): string {
    return 'score';
  }

  static clone(node: ScoreNode): ScoreNode {
    return new ScoreNode(
      node.__src,
      node.__altText,
      node.__width,
      node.__height,
      node.__style,
      node.__id,
      node.__attachmentUrl,
      node.__attachmentSignedUrl,
      node.__showCaption,
      node.__signedUrl,
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedScoreNode): ScoreNode {
    const { width, height, src, style, id, showCaption, altText, attachmentUrl } = serializedNode;
    const node = $createScoreNode({
      src,
      width,
      height,
      style,
      id,
      showCaption,
      altText,
      attachmentUrl,
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
    attachmentUrl: string,
    attachmentSignedUrl?: string,
    showCaption?: boolean,
    signedUrl?: string,
    key?: NodeKey,
  ) {
    super(src, altText, width, height, style, id, showCaption, signedUrl, key);
    this.__attachmentUrl = attachmentUrl;
    this.__attachmentSignedUrl = attachmentSignedUrl;
  }

  exportJSON(): SerializedScoreNode {
    return {
      ...super.exportJSON(),
      attachmentUrl: this.__attachmentUrl,
      type: 'score',
      version: 1,
    };
  }

  getAttachmentUrl(): string {
    return this.__attachmentUrl;
  }

  setAttachmentUrl(attachmentUrl: string): void {
    const writable = this.getWritable();
    writable.__attachmentUrl = attachmentUrl;
  }

  getAttachmentSignedUrl(): string | undefined {
    const cachedSignedUrl = signedUrlMap.get(this.__attachmentUrl);
    if (cachedSignedUrl) {
      return cachedSignedUrl;
    } else if (this.__attachmentSignedUrl) {
      signedUrlMap.set(this.__attachmentUrl, this.__attachmentSignedUrl);
    }
    return this.__attachmentSignedUrl;
  }

  setAttachmentSignedUrl(attachmentSignedUrl: string): void {
    signedUrlMap.set(this.__attachmentUrl, attachmentSignedUrl);
    const writable = this.getWritable();
    writable.__attachmentSignedUrl = attachmentSignedUrl;
  }

  updateDOM(prevNode: ScoreNode): boolean {
    return (
      super.updateDOM(prevNode) ||
      this.__attachmentUrl !== prevNode.__attachmentUrl ||
      this.__attachmentSignedUrl !== prevNode.__attachmentSignedUrl
    );
  }

  static importDOM(): DOMConversionMap | null {
    return super.importDOM();
  }

  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement {
    const figure = super.createDOM(config, editor);
    const attachmentSignedUrl = this.getAttachmentSignedUrl();
    if (attachmentSignedUrl) {
      figure.insertAdjacentHTML(
        'afterbegin',
        `<a href="${attachmentSignedUrl}" download aria-label="Download score" class="absolute top-2 right-2 z-10 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg:not([class*='size-'])]:size-4 shrink-0 [&amp;_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border shadow-xs hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 size-9 bg-transparent"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download" aria-hidden="true"><path d="M12 15V3"></path><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="m7 10 5 5 5-5"></path></svg><span class="sr-only">Download</span></a>`,
      );
    }
    return figure;
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const output = super.exportDOM(editor);
    const element = output.element;
    if (!isHTMLElement(element)) {
      return output;
    }

    const attachmentSignedUrl = this.getAttachmentSignedUrl();
    if (attachmentSignedUrl) {
      element.insertAdjacentHTML(
        'afterbegin',
        `<a href="${attachmentSignedUrl}" download aria-label="Download score" class="absolute top-2 right-2 z-10 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg:not([class*='size-'])]:size-4 shrink-0 [&amp;_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border shadow-xs hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 size-9 bg-transparent"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download" aria-hidden="true"><path d="M12 15V3"></path><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="m7 10 5 5 5-5"></path></svg><span class="sr-only">Download</span></a>`,
      );
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
}

export function $createScoreNode({
  src,
  altText = 'Score',
  key,
  width,
  height,
  style,
  id,
  showCaption,
  signedUrl,
  attachmentUrl,
  attachmentSignedUrl,
}: ScorePayload): ScoreNode {
  const score = new ScoreNode(
    src,
    altText,
    width,
    height,
    style,
    id,
    attachmentUrl,
    attachmentSignedUrl,
    showCaption,
    signedUrl,
    key,
  );
  return score;
}

export function $isScoreNode(node: LexicalNode | null | undefined): node is ScoreNode {
  return node instanceof ScoreNode;
}
