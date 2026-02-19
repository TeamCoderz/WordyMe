/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { QuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableRowNode, TableNode } from '@repo/editor/nodes/TableNode';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import 'prismjs/components/prism-csharp';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { HorizontalRuleNode } from '@repo/editor/nodes/HorizontalRuleNode';
import { MathNode } from '@repo/editor/nodes/MathNode';
import { $isImageNode, ImageNode } from '@repo/editor/nodes/ImageNode';
import { SketchNode } from '@repo/editor/nodes/SketchNode';
import { DiagramNode } from '@repo/editor/nodes/DiagramNode';
import { ScoreNode } from '@repo/editor/nodes/ScoreNode';
import { StickyNode } from '@repo/editor/nodes/StickyNode';
import theme from '@repo/editor/theme';
import { PageBreakNode } from '@repo/editor/nodes/PageBreakNode';
import { IFrameNode } from '@repo/editor/nodes/IFrameNode';
import { LayoutContainerNode, LayoutItemNode } from '@repo/editor/nodes/LayoutNode';
import type { InitialConfigType } from '@lexical/react/LexicalComposer';
import type { CreateEditorArgs } from 'lexical';
import { LexicalTableCellNode, LexicalTableNode } from '@repo/editor/nodes/TableNode';
import {
  DetailsContainerNode,
  DetailsContentNode,
  DetailsSummaryNode,
} from '@repo/editor/nodes/DetailsNode';
import { HeadingNode, LexicalHeadingNode } from '@repo/editor/nodes/HeadingNode';
import { AlertNode } from '@repo/editor/nodes/AlertNode';
import { MetadataNode } from '@repo/editor/nodes/MetadataNode';
import { $isAttachmentNode, AttachmentNode } from '@repo/editor/nodes/AttachmentNode';
import {
  PageContentNode,
  PageFooterNode,
  PageHeaderNode,
  PageNumberNode,
  PageNode,
  PageSetupNode,
} from '@repo/editor/nodes/PageNode';
import { DOMExportOutput, ParagraphNode, isHTMLElement } from 'lexical';
import type { HTMLConfig, Klass, LexicalEditor, LexicalNode } from 'lexical';

export const htmlConfig: HTMLConfig = {
  export: new Map<
    Klass<LexicalNode>,
    (editor: LexicalEditor, target: LexicalNode) => DOMExportOutput
  >([
    [
      ParagraphNode,
      (editor, node) => {
        const paragraphNode = node as ParagraphNode;
        const output = paragraphNode.exportDOM(editor);
        const element = output.element;
        if (!element || !isHTMLElement(element)) return output;
        const direction = paragraphNode.getDirection();
        element.dir = direction ?? 'auto';
        const children = paragraphNode.getChildren();
        const hasFigures = children.some($isImageNode);
        const hasAttachments = children.some($isAttachmentNode);
        if (!hasFigures && !hasAttachments) return output;
        const div = document.createElement('div');
        div.append(...Array.from(element.childNodes));
        for (const attr of Array.from(element.attributes)) {
          div.setAttribute(attr.name, attr.value);
        }
        return { element: div };
      },
    ],
    [
      ListNode,
      (editor, node) => {
        const listNode = node as ListNode;
        const output = listNode.exportDOM(editor);
        const element = output.element;
        if (!element || !isHTMLElement(element)) return output;
        const direction = listNode.getDirection();
        if (direction) {
          element.dir = direction;
        }
        return { element };
      },
    ],
    [
      ListItemNode,
      (editor, node) => {
        const listItemNode = node as ListItemNode;
        const output = listItemNode.exportDOM(editor);
        const element = output.element;
        if (!element || !isHTMLElement(element)) return output;
        const direction = listItemNode.getDirection();
        element.dir = direction ?? 'auto';
        // linkedom doesn't support value attribute
        const value = listItemNode.getValue();
        if (value) {
          element.setAttribute('value', value.toString());
        }
        return { element };
      },
    ],
    [
      QuoteNode,
      (editor, node) => {
        const quoteNode = node as QuoteNode;
        const output = quoteNode.exportDOM(editor);
        const element = output.element;
        if (!element || !isHTMLElement(element)) return output;
        const direction = quoteNode.getDirection();
        element.dir = direction ?? 'auto';
        return { element };
      },
    ],
    [
      LinkNode,
      (editor, node) => {
        const linkNode = node as LinkNode;
        const output = linkNode.exportDOM(editor);
        const element = output.element;
        if (!element || !isHTMLElement(element)) return output;
        const url = linkNode.getURL();
        const target = linkNode.getTarget();
        if (target === '_self') element.setAttribute('id', url.slice(1));
        if (target !== '_blank') element.removeAttribute('target');
        element.removeAttribute('rel');
        return { element };
      },
    ],
  ]),
};

export const editorConfig = {
  namespace: 'wordy',
  // The editor theme
  theme: theme,
  // Handling of errors during update
  onError(error: Error) {
    throw error;
  },
  // Any custom nodes go here
  nodes: [
    AlertNode,
    MetadataNode,
    PageSetupNode,
    HeadingNode,
    {
      replace: LexicalHeadingNode,
      with: (node: LexicalHeadingNode) => new HeadingNode(node.__tag),
      withKlass: HeadingNode,
    },
    ListNode,
    ListItemNode,
    QuoteNode,
    CodeNode,
    CodeHighlightNode,
    TableNode,
    TableCellNode,
    {
      replace: LexicalTableNode,
      with: () => new TableNode(),
      withKlass: TableNode,
    },
    {
      replace: LexicalTableCellNode,
      with: (node: LexicalTableCellNode) =>
        new TableCellNode(node.__headerState, node.__colSpan, node.__width),
      withKlass: TableCellNode,
    },
    TableRowNode,
    AutoLinkNode,
    LinkNode,
    HorizontalRuleNode,
    MathNode,
    ImageNode,
    SketchNode,
    DiagramNode,
    ScoreNode,
    StickyNode,
    PageBreakNode,
    IFrameNode,
    LayoutContainerNode,
    LayoutItemNode,
    DetailsContainerNode,
    DetailsContentNode,
    DetailsSummaryNode,
    AttachmentNode,
    PageHeaderNode,
    PageContentNode,
    PageFooterNode,
    PageNode,
    PageNumberNode,
  ],
  html: htmlConfig,
} satisfies InitialConfigType & CreateEditorArgs;
