/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { StateCreator } from 'zustand';
import type { SortOptions } from '@/types/sort';
import type { Store } from './store';

export type AppSidebarState = 'expanded' | 'collapsed' | 'remember';

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
};

export type UiSlice = UiState & { uiActions: UiActions };

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
};

export const createUiSlice: StateCreator<
  Store,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  [],
  UiSlice
> = (set) => {
  return {
    ...initialState,
    uiActions: {
      setAppSidebar: (appSidebar) => set({ appSidebar }),
      setAppSidebarOpen: (appSidebarOpen) => set({ appSidebarOpen }),
      setDocumentSidebar: (documentSidebar) => set({ documentSidebar }),
      setDocumentSidebarOpen: (documentSidebarOpen) => set({ documentSidebarOpen }),
      setDocumentSidebarActiveTab: (documentSidebarActiveTab) => set({ documentSidebarActiveTab }),
      setCreateDocumentSectionHidden: (createDocumentSectionHidden) =>
        set({ createDocumentSectionHidden }),
      setFeedbackCardHidden: (feedbackCardHidden) => set({ feedbackCardHidden }),
      setHomeSorts: (sorts) =>
        set((state) => ({
          homeSorts: typeof sorts === 'function' ? sorts(state.homeSorts) : sorts,
        })),
    },
  };
};
