/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { createStore } from 'zustand/vanilla';
import { devtools, persist } from 'zustand/middleware';
import { createUserSlice, UserSlice } from './user-slice';
import { createUiSlice, UiSlice } from './ui-slice';
import { createTabsSlice, TabsSlice } from './tabs-slice';
import { createWordySlice, WordySlice } from './wordy-slice';

export type Store = UserSlice & UiSlice & TabsSlice & WordySlice;

export const store = createStore<Store>()(
  devtools(
    persist(
      (...a) => ({
        ...createUserSlice(...a),
        ...createUiSlice(...a),
        ...createTabsSlice(...a),
        ...createWordySlice(...a),
      }),
      {
        name: 'Wordy',
        version: 2,
        partialize: (state) => ({
          activeSpace: state.activeSpace,
          tabs: state.tabs,
          appSidebar: state.appSidebar,
          appSidebarOpen: state.appSidebarOpen,
          documentSidebar: state.documentSidebar,
          documentSidebarOpen: state.documentSidebarOpen,
          documentSidebarActiveTab: state.documentSidebarActiveTab,
          createDocumentSectionHidden: state.createDocumentSectionHidden,
          feedbackCardHidden: state.feedbackCardHidden,
          homeSorts: state.homeSorts,
        }),
        migrate: (persistedState, version) => {
          const state = persistedState as Record<string, unknown>;
          if (
            version === 1 &&
            (state.editorSidebar !== undefined || state.editorSidebarOpen !== undefined)
          ) {
            const { editorSidebar, editorSidebarOpen, ...rest } = state;
            return {
              ...rest,
              documentSidebar: rest.documentSidebar ?? editorSidebar,
              documentSidebarOpen: rest.documentSidebarOpen ?? editorSidebarOpen,
            };
          }
          return state;
        },
      },
    ),
    { name: 'Wordy' },
  ),
);
