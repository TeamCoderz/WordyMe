import {
  $createNodeSelection,
  $setSelection,
  BaseSelection,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
  isHTMLElement,
} from 'lexical';
import { DecoratorNode } from 'lexical';
import { convertLatexToMarkup } from 'mathlive';
import MathComponent from './MathComponent';
import { JSX } from 'react';

export type SerializedMathNode = Spread<
  { type: 'math'; value: string; style: string; id: string },
  SerializedLexicalNode
>;

function $convertMathElement(domNode: HTMLElement): null | DOMConversionOutput {
  const value = domNode.getAttribute('data-lexical-math');
  const id = domNode.id;
  const style = domNode.style.cssText;
  if (value) {
    const node = $createMathNode(value, style, id);
    return { node };
  }

  return null;
}

export class MathNode extends DecoratorNode<JSX.Element> {
  __value: string;
  __style: string;
  __id: string;

  static getType(): string {
    return 'math';
  }

  static clone(node: MathNode): MathNode {
    return new MathNode(node.__value, node.__style, node.__id, node.__key);
  }

  constructor(value: string, style: string, id: string, key?: NodeKey) {
    super(key);
    this.__value = value;
    this.__style = style;
    this.__id = id;
  }

  static importJSON(serializedNode: SerializedMathNode): MathNode {
    const node = $createMathNode(serializedNode.value, serializedNode.style, serializedNode.id);
    return node;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute('data-lexical-math')) {
          return null;
        }
        return {
          conversion: $convertMathElement,
          priority: 1,
        };
      },
    };
  }

  exportJSON(): SerializedMathNode {
    return {
      value: this.getValue(),
      style: this.getStyle(),
      id: this.getId(),
      type: 'math',
      version: 1,
    };
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const { element } = super.exportDOM(editor);
    if (element && isHTMLElement(element)) {
      element.setAttribute('data-lexical-math', this.getValue());
      element.innerHTML = convertLatexToMarkup(this.getValue(), {
        registers: { arraystretch: 1.5 },
      });
    }
    return { element };
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('span');
    const className = config.theme.math;
    if (className !== undefined) {
      element.className = className;
    }
    if (this.__style) element.style.cssText = this.__style;
    if (this.__id) element.id = this.__id;
    return element;
  }

  updateDOM(prevNode: MathNode, dom: HTMLElement): boolean {
    const prevStyle = prevNode.__style;
    const nextStyle = this.__style;
    if (prevStyle !== nextStyle) {
      dom.style.cssText = nextStyle;
    }
    if (prevNode.__id !== this.__id) {
      dom.id = this.__id;
    }
    return false;
  }

  getText(): string {
    return `$${this.__value}$`;
  }

  getTextContentSize(): number {
    return this.__value.length + 2;
  }

  getTextContent(): string {
    return `$${this.__value}$`;
  }

  getValue(): string {
    return this.__value;
  }

  setValue(value: string): void {
    const writable = this.getWritable();
    writable.__value = value;
  }

  getStyle(): string {
    const self = this.getLatest();
    return self.__style;
  }

  setStyle(style: string): this {
    const self = this.getWritable();
    self.__style = style;
    return self;
  }

  getId(): string {
    const self = this.getLatest();
    return self.__id;
  }

  setId(id: string): this {
    const self = this.getWritable();
    self.__id = id;
    return self;
  }

  select() {
    const nodeSelection = $createNodeSelection();
    nodeSelection.add(this.getKey());
    $setSelection(nodeSelection);
  }

  isSelected(selection?: null | BaseSelection): boolean {
    try {
      return super.isSelected(selection);
    } catch {
      return false;
    }
  }

  decorate(): JSX.Element {
    return <MathComponent initialValue={this.__value} nodeKey={this.__key} />;
  }
}

export function $createMathNode(value = '', style = '', id = ''): MathNode {
  const mathNode = new MathNode(value, style, id);
  return mathNode;
}

export function $isMathNode(node: LexicalNode | null | undefined): node is MathNode {
  return node instanceof MathNode;
}
