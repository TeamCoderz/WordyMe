/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { ElementFormatType, LexicalNode } from 'lexical';
import { createStore } from 'zustand/vanilla';
import { TableCellHeaderStates } from '@lexical/table';
import { createContext } from 'react';
import type { AlertVariant } from '@repo/editor/nodes/AlertNode';
import type { DetailsVariant } from '@repo/editor/nodes/DetailsNode';
import type { HorizontalRuleVariant } from '@repo/editor/nodes/HorizontalRuleNode';
import { LinkNode } from '@lexical/link';
import { BlockType, FontFamily, EditorDialogType, DEFAULT_FONT_SIZE } from './constants';
import { Services } from './types';
import { PageSetup } from '@repo/editor/nodes/PageNode';

export interface EditorStoreState {
  bgColor: string | null;
  blockType: BlockType;
  canRedo: boolean;
  canUndo: boolean;
  codeLanguage: string;
  codeTheme: string;
  elementFormat: ElementFormatType;
  indentationLevel: number;
  fontColor: string | null;
  fontFamily: FontFamily;
  // Current font size in px
  fontSize: string;
  // Font size input value - for controlled input
  fontSizeInputValue: string;
  isBold: boolean;
  isCode: boolean;
  isHighlight: boolean;
  isImageCaption: boolean;
  isImage: boolean;
  isItalic: boolean;
  isLink: boolean;
  isRTL: boolean;
  isStrikethrough: boolean;
  isSubscript: boolean;
  isSuperscript: boolean;
  isUnderline: boolean;
  isLowercase: boolean;
  isUppercase: boolean;
  isCapitalize: boolean;
  isTable: boolean;
  isNote: boolean;
  isAlert: boolean;
  isDetails: boolean;
  isMath: boolean;
  isHorizontalRule: boolean;
  isAttachment: boolean;
  alertVariant: AlertVariant;
  detailsVariant: DetailsVariant;
  detailsEditable: boolean;
  horizontalRuleVariant: HorizontalRuleVariant;
  canMergeTableCells: boolean;
  canUnmergeTableCell: boolean;
  tableSelectionCounts: {
    rows: number;
    columns: number;
  };
  tableCellHeaderState: (typeof TableCellHeaderStates)[keyof typeof TableCellHeaderStates];
  tableRowStriping: boolean;
  tableStyle: {
    float: 'none' | 'left' | 'right';
    formatType: ElementFormatType;
    borderStyle: string;
    borderWidth: string;
    borderColor: string | null;
    backgroundColor: string | null;
    color: string | null;
  };
  tableCellStyle: {
    writingMode: '' | 'vertical-rl';
    backgroundColor: string | null;
    color: string | null;
  };
  noteStyle: {
    float: 'left' | 'right';
    color: string | null;
    backgroundColor: string | null;
  };
  imageStyle: {
    float: 'none' | 'left' | 'right';
    filter: string | null;
  };
  listStartNumber: number | null;
  selectedNode: LexicalNode | null;
  selectedLinkNode: LinkNode | null;
  openDialog: EditorDialogType;
  isSelectionNullOrCollapsed: boolean;
  checksum: string | null;
  isPageHeader: boolean;
  isPageFooter: boolean;
  pageSetup: PageSetup | null;
}

type EditorStoreStateKey = keyof EditorStoreState;
type EditorStoreStateValue<Key extends EditorStoreStateKey> = EditorStoreState[Key];

export interface EditorStoreActions extends Services {
  updateEditorStoreState: <Key extends EditorStoreStateKey>(
    key: Key,
    value: EditorStoreStateValue<Key>,
  ) => void;
}

export type EditorStore = EditorStoreState & { actions: EditorStoreActions };

const defaultInitState: EditorStoreState = {
  bgColor: null,
  blockType: 'paragraph',
  canRedo: false,
  canUndo: false,
  codeLanguage: '',
  codeTheme: '',
  elementFormat: 'left',
  indentationLevel: 0,
  fontColor: null,
  fontFamily: 'Roboto',
  fontSize: `${DEFAULT_FONT_SIZE}px`,
  fontSizeInputValue: `${DEFAULT_FONT_SIZE}`,
  isBold: false,
  isCode: false,
  isHighlight: false,
  isImageCaption: false,
  isImage: false,
  isItalic: false,
  isLink: false,
  isRTL: false,
  isStrikethrough: false,
  isSubscript: false,
  isSuperscript: false,
  isUnderline: false,
  isLowercase: false,
  isUppercase: false,
  isCapitalize: false,
  isTable: false,
  isNote: false,
  isAlert: false,
  isDetails: false,
  isMath: false,
  isHorizontalRule: false,
  isAttachment: false,
  alertVariant: 'default',
  detailsVariant: 'rounded',
  detailsEditable: true,
  horizontalRuleVariant: 'single',
  canMergeTableCells: false,
  canUnmergeTableCell: false,
  tableSelectionCounts: {
    rows: 1,
    columns: 1,
  },
  tableCellHeaderState: TableCellHeaderStates.NO_STATUS,
  tableRowStriping: false,
  tableStyle: {
    float: 'none',
    formatType: '',
    borderStyle: 'solid',
    borderWidth: '1px',
    borderColor: null,
    backgroundColor: null,
    color: null,
  },
  tableCellStyle: {
    writingMode: '',
    backgroundColor: null,
    color: null,
  },
  noteStyle: {
    float: 'right',
    color: null,
    backgroundColor: null,
  },
  imageStyle: {
    float: 'none',
    filter: null,
  },
  listStartNumber: null,
  selectedNode: null,
  selectedLinkNode: null,
  openDialog: null,
  isSelectionNullOrCollapsed: true,
  checksum: null,
  isPageHeader: false,
  isPageFooter: false,
  pageSetup: null,
};

export const createEditorStore = (services?: Services, initState = defaultInitState) => {
  return createStore<EditorStore>()((set) => ({
    ...initState,
    actions: {
      getAttachmentSignedUrl:
        services?.getAttachmentSignedUrl ?? (async () => ({ error: null, data: null })),
      getImageSignedUrl: services?.getImageSignedUrl ?? (async () => ({ error: null, data: null })),
      uploadAttachment: services?.uploadAttachment ?? (async () => ({ error: null, data: null })),
      uploadImage: services?.uploadImage ?? (async () => ({ error: null, data: null })),
      navigate: services?.navigate ?? (() => void 0),
      getSpaces: services?.getSpaces ?? (async () => []),
      getDocumentsBySpaceId: services?.getDocumentsBySpaceId ?? (async () => []),
      getDocumentById: services?.getDocumentById ?? (async () => null),
      getDocumentByHandle: services?.getDocumentByHandle ?? (async () => null),
      getLocalRevisionByDocumentId: services?.getLocalRevisionByDocumentId ?? (async () => null),
      getRevisionsByDocumentId: services?.getRevisionsByDocumentId ?? (async () => []),
      getRevisionById: services?.getRevisionById ?? (async () => null),
      updateEditorStoreState: <Key extends EditorStoreStateKey>(
        key: Key,
        value: EditorStoreStateValue<Key>,
      ) => {
        set((state) => {
          const newState = { ...state, [key]: value };

          // Auto-sync fontSizeInputValue when fontSize changes
          if (key === 'fontSize' && typeof value === 'string') {
            newState.fontSizeInputValue = value.slice(0, -2);
          }

          return newState;
        });
      },
    },
  }));
};

export type EditorStoreApi = ReturnType<typeof createEditorStore>;
export const EditorStoreContext = createContext<EditorStoreApi | undefined>(undefined);
