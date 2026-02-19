/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { SerializedHeadingNode } from '@repo/editor/nodes/HeadingNode';
import type {
  SerializedEditorState,
  SerializedParagraphNode,
  SerializedRootNode,
  SerializedTextNode,
} from 'lexical';
import {
  DEFAULT_PAGE_SETUP,
  SerializedPageSetupNode,
  SerializedPageContentNode,
  SerializedPageFooterNode,
  SerializedPageHeaderNode,
  SerializedPageNode,
} from '@repo/editor/nodes/PageNode';

export const getInitialEditorState = (title: string): SerializedEditorState => {
  const pageSetup: SerializedPageSetupNode = {
    type: 'page-setup',
    version: 1,
    ...DEFAULT_PAGE_SETUP,
  };
  const headingText: SerializedTextNode = {
    detail: 0,
    format: 0,
    mode: 'normal',
    style: '',
    text: title,
    type: 'text',
    version: 1,
  };
  const heading: SerializedHeadingNode = {
    children: [headingText],
    direction: null,
    format: '',
    indent: 0,
    type: 'wordy-heading',
    version: 1,
    tag: 'h2',
    id: '',
  };
  const paragraph: SerializedParagraphNode = {
    children: [],
    direction: null,
    format: '',
    indent: 0,
    type: 'paragraph',
    version: 1,
    textFormat: 0,
    textStyle: '',
  };
  const headerNode: SerializedPageHeaderNode = {
    children: [],
    direction: null,
    format: '',
    indent: 0,
    type: 'page-header',
    version: 1,
  };
  const footerNode: SerializedPageFooterNode = {
    children: [],
    direction: null,
    format: '',
    indent: 0,
    type: 'page-footer',
    version: 1,
  };
  const pageContentNode: SerializedPageContentNode = {
    children: [heading, paragraph],
    direction: null,
    format: '',
    indent: 0,
    type: 'page-content',
    version: 1,
  };
  const pageNode: SerializedPageNode = {
    children: [headerNode, pageContentNode, footerNode],
    direction: null,
    format: '',
    indent: 0,
    type: 'page',
    version: 1,
  };
  const root: SerializedRootNode = {
    children: [pageSetup, pageNode],
    direction: null,
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  };
  return { root };
};
