import {
  TableCellNode as LexicalTableCellNode,
  SerializedTableCellNode as LexicalSerializedTableCellNode,
  TableCellHeaderStates,
  $isTableNode,
} from '@lexical/table';

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
} from 'lexical';

import {
  $applyNodeReplacement,
  $createParagraphNode,
  $findMatchingParent,
  $isElementNode,
  $isLineBreakNode,
  $isTextNode,
} from 'lexical';

import { getStyleObjectFromRawCSS } from '@repo/editor/utils/nodeUtils';

export type TableCellHeaderState =
  (typeof TableCellHeaderStates)[keyof typeof TableCellHeaderStates];

export type SerializedTableCellNode = LexicalSerializedTableCellNode & {
  style: string;
};

/** @noInheritDoc */
export class TableCellNode extends LexicalTableCellNode {
  static getType(): string {
    return 'wordy-tablecell';
  }

  static clone(node: TableCellNode): TableCellNode {
    const cellNode = new TableCellNode(
      node.__headerState,
      node.__colSpan,
      node.__width,
      node.__key,
    );
    cellNode.__rowSpan = node.__rowSpan;
    cellNode.__backgroundColor = node.__backgroundColor;
    cellNode.__style = node.__style;
    return cellNode;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      td: () => ({
        conversion: $convertTableCellNodeElement,
        priority: 0,
      }),
      th: () => ({
        conversion: $convertTableCellNodeElement,
        priority: 0,
      }),
    };
  }

  static importJSON(serializedNode: SerializedTableCellNode): TableCellNode {
    const colSpan = serializedNode.colSpan || 1;
    const rowSpan = serializedNode.rowSpan || 1;
    const cellNode = $createTableCellNode(
      serializedNode.headerState,
      colSpan,
      serializedNode.width || undefined,
    );
    cellNode.__rowSpan = rowSpan;
    cellNode.__backgroundColor = serializedNode.backgroundColor || null;
    cellNode.__style = serializedNode.style;
    // set the background color from the style for selection highlight in base lexical node
    const styles = getStyleObjectFromRawCSS(cellNode.__style);
    const backgroundColor = styles['background-color'];
    if (backgroundColor) {
      cellNode.__backgroundColor = backgroundColor;
    }
    return cellNode;
  }

  constructor(
    headerState = TableCellHeaderStates.NO_STATUS,
    colSpan = 1,
    width?: number,
    key?: NodeKey,
  ) {
    super(headerState, colSpan, width, key);
    this.__style = '';
  }

  createDOM(config: EditorConfig): HTMLTableCellElement {
    const element = super.createDOM(config);
    element.setAttribute('style', `anchor-name: --table-cell-anchor-${this.getKey()};`);
    const styles = getStyleObjectFromRawCSS(this.__style);
    const color = styles.color;
    const backgroundColor = styles['background-color'];
    const writingMode = styles['writing-mode'];
    element.style.color = color;
    element.style.backgroundColor = backgroundColor;
    element.style.writingMode = writingMode;
    const tableNode = $findMatchingParent(this, $isTableNode);
    const tableStyles = getStyleObjectFromRawCSS(tableNode?.getStyle() ?? '');
    const borderStyle = tableStyles['border-style'];
    const borderWidth = tableStyles['border-width'];
    const borderColor = tableStyles['border-color'];
    if (borderStyle) element.style.borderStyle = borderStyle;
    if (borderWidth) element.style.borderWidth = borderWidth;
    if (borderColor) element.style.borderColor = borderColor;
    return element;
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const element = this.createDOM(editor._config);

    return {
      element,
    };
  }

  exportJSON(): SerializedTableCellNode {
    return {
      ...super.exportJSON(),
      style: this.__style,
      type: TableCellNode.getType(),
    };
  }

  setStyle(style: string): this {
    const self = this.getWritable();
    self.__style = style;
    // set the background color from the style for selection highlight in base lexical node
    const styles = getStyleObjectFromRawCSS(style);
    const backgroundColor = styles['background-color'];
    if (backgroundColor) {
      self.__backgroundColor = backgroundColor;
    }
    return self;
  }

  updateDOM(prevNode: this): boolean {
    return super.updateDOM(prevNode) || prevNode.__style !== this.__style;
  }
}

export function $convertTableCellNodeElement(domNode: Node): DOMConversionOutput {
  const domNode_ = domNode as HTMLTableCellElement;
  const nodeName = domNode.nodeName.toLowerCase();

  let width: number | undefined = undefined;
  const PIXEL_VALUE_REG_EXP = /^(\d+(?:\.\d+)?)px$/;

  if (PIXEL_VALUE_REG_EXP.test(domNode_.style.width)) {
    width = parseFloat(domNode_.style.width);
  }

  const tableCellNode = $createTableCellNode(
    nodeName === 'th' ? TableCellHeaderStates.ROW : TableCellHeaderStates.NO_STATUS,
    domNode_.colSpan,
    width,
  );

  tableCellNode.__rowSpan = domNode_.rowSpan;
  const cssText = domNode_.style.cssText;
  tableCellNode.__style = cssText;

  const style = domNode_.style;
  const textDecoration = style.textDecoration.split(' ');
  const hasBoldFontWeight = style.fontWeight === '700' || style.fontWeight === 'bold';
  const hasLinethroughTextDecoration = textDecoration.includes('line-through');
  const hasItalicFontStyle = style.fontStyle === 'italic';
  const hasUnderlineTextDecoration = textDecoration.includes('underline');
  return {
    after: (childLexicalNodes) => {
      if (childLexicalNodes.length === 0) {
        childLexicalNodes.push($createParagraphNode());
      }
      return childLexicalNodes;
    },
    forChild: (lexicalNode, parentLexicalNode) => {
      if ($isTableCellNode(parentLexicalNode) && !$isElementNode(lexicalNode)) {
        const paragraphNode = $createParagraphNode();
        if ($isLineBreakNode(lexicalNode) && lexicalNode.getTextContent() === '\n') {
          return null;
        }
        if ($isTextNode(lexicalNode)) {
          if (hasBoldFontWeight) {
            lexicalNode.toggleFormat('bold');
          }
          if (hasLinethroughTextDecoration) {
            lexicalNode.toggleFormat('strikethrough');
          }
          if (hasItalicFontStyle) {
            lexicalNode.toggleFormat('italic');
          }
          if (hasUnderlineTextDecoration) {
            lexicalNode.toggleFormat('underline');
          }
        }
        paragraphNode.append(lexicalNode);
        return paragraphNode;
      }

      return lexicalNode;
    },
    node: tableCellNode,
  };
}

export function $createTableCellNode(
  headerState: TableCellHeaderState = TableCellHeaderStates.NO_STATUS,
  colSpan = 1,
  width?: number,
): TableCellNode {
  return $applyNodeReplacement(new TableCellNode(headerState, colSpan, width));
}

export function $isTableCellNode(node: LexicalNode | null | undefined): node is TableCellNode {
  return node instanceof TableCellNode;
}
