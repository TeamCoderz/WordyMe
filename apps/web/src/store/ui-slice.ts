/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { StateCreator } from 'zustand';
import type { SortOptions } from '@/types/sort';
import type { Theme } from '@repo/ui/theme/themes';
import type { Store } from './store';

export type AppSidebarState = 'expanded' | 'collapsed' | 'remember';

export type DocumentLinkTarget = 'current-pane' | 'split-view';

export type FolderColor = 'theme' | Theme['color-variants'][number]['value'];

export type HomeSortState = {
  favoriteSpaces: SortOptions;
  favoriteDocuments: SortOptions;
  allDocs: SortOptions;
};

type UiState = {
  appSidebar: AppSidebarState;
  appSidebarOpen: boolean;
  documentSidebar: AppSidebarState;
  documentSidebarOpen: boolean;
  documentSidebarActiveTab: string;
  createDocumentSectionHidden: boolean;
  feedbackCardHidden: boolean;
  homeSorts: HomeSortState;
  folderColorsEnabled: boolean;
  folderDefaultColor: FolderColor;
  folderColorSolid: boolean;
  documentLinkTarget: DocumentLinkTarget;
  splitTabsArePreview: boolean;
};

type UiActions = {
  setAppSidebar: (sidebar: AppSidebarState) => void;
  setAppSidebarOpen: (open: boolean) => void;
  setDocumentSidebar: (sidebar: AppSidebarState) => void;
  setDocumentSidebarOpen: (open: boolean) => void;
  setDocumentSidebarActiveTab: (tab: string) => void;
  setCreateDocumentSectionHidden: (hidden: boolean) => void;
  setFeedbackCardHidden: (hidden: boolean) => void;
  setHomeSorts: (sorts: HomeSortState | ((prev: HomeSortState) => HomeSortState)) => void;
  setFolderColorsEnabled: (enabled: boolean) => void;
  setFolderDefaultColor: (color: FolderColor) => void;
  setFolderColorSolid: (solid: boolean) => void;
  setDocumentLinkTarget: (target: DocumentLinkTarget) => void;
  setSplitTabsArePreview: (preview: boolean) => void;
};

export type UiSlice = { ui: UiState; uiActions: UiActions };

const initialState: UiState = {
  appSidebar: 'expanded',
  appSidebarOpen: true,
  documentSidebar: 'expanded',
  documentSidebarOpen: true,
  documentSidebarActiveTab: 'table-of-contents',
  createDocumentSectionHidden: false,
  feedbackCardHidden: false,
  homeSorts: {
    favoriteSpaces: 'a-z',
    favoriteDocuments: 'a-z',
    allDocs: 'a-z',
  },
  folderColorsEnabled: false,
  folderDefaultColor: 'theme',
  folderColorSolid: false,
  documentLinkTarget: 'split-view',
  splitTabsArePreview: true,
};

export const createUiSlice: StateCreator<
  Store,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  [],
  UiSlice
> = (set) => {
  return {
    ui: initialState,
    uiActions: {
      setAppSidebar: (appSidebar) => set((state) => ({ ui: { ...state.ui, appSidebar } })),
      setAppSidebarOpen: (appSidebarOpen) =>
        set((state) => ({ ui: { ...state.ui, appSidebarOpen } })),
      setDocumentSidebar: (documentSidebar) =>
        set((state) => ({ ui: { ...state.ui, documentSidebar } })),
      setDocumentSidebarOpen: (documentSidebarOpen) =>
        set((state) => ({ ui: { ...state.ui, documentSidebarOpen } })),
      setDocumentSidebarActiveTab: (documentSidebarActiveTab) =>
        set((state) => ({ ui: { ...state.ui, documentSidebarActiveTab } })),
      setCreateDocumentSectionHidden: (createDocumentSectionHidden) =>
        set((state) => ({ ui: { ...state.ui, createDocumentSectionHidden } })),
      setFeedbackCardHidden: (feedbackCardHidden) =>
        set((state) => ({ ui: { ...state.ui, feedbackCardHidden } })),
      setHomeSorts: (sorts) =>
        set((state) => ({
          ui: {
            ...state.ui,
            homeSorts: typeof sorts === 'function' ? sorts(state.ui.homeSorts) : sorts,
          },
        })),
      setFolderColorsEnabled: (folderColorsEnabled) =>
        set((state) => ({ ui: { ...state.ui, folderColorsEnabled } })),
      setFolderDefaultColor: (folderDefaultColor) =>
        set((state) => ({ ui: { ...state.ui, folderDefaultColor } })),
      setFolderColorSolid: (folderColorSolid) =>
        set((state) => ({ ui: { ...state.ui, folderColorSolid } })),
      setDocumentLinkTarget: (documentLinkTarget) =>
        set((state) => ({ ui: { ...state.ui, documentLinkTarget } })),
      setSplitTabsArePreview: (splitTabsArePreview) =>
        set((state) => ({ ui: { ...state.ui, splitTabsArePreview } })),
    },
  };
};
