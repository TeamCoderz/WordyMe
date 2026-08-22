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
import { createAppSlice, AppSlice } from './app-slice';

export type Store = AppSlice & UserSlice & UiSlice & TabsSlice & WordySlice;

export const store = createStore<Store>()(
  devtools(
    persist(
      (...a) => ({
        ...createAppSlice(...a),
        ...createUserSlice(...a),
        ...createUiSlice(...a),
        ...createTabsSlice(...a),
        ...createWordySlice(...a),
      }),
      {
        name: 'Wordy',
        version: 5,
        migrate: (persistedState, version) => {
          const state = (persistedState ?? {}) as Pick<Store, 'app' | 'tabs' | 'ui' | 'wordy'>;
          // v5: the split-view default changed before the feature shipped, so
          // the only persisted 'current-pane' values come from pre-release builds.
          if (version < 5 && state.ui) {
            return { ...state, ui: { ...state.ui, documentLinkTarget: 'split-view' as const } };
          }
          return state;
        },
        partialize: (state) => ({
          app: state.app,
          tabs: {
            ...state.tabs,
            tabList: state.tabs.tabList.map(
              ({ isSaving: _s, isJustSaved: _j, isPreview: _p, ...rest }) => rest,
            ),
          },
          ui: state.ui,
          wordy: state.wordy,
        }),
        // Zustand's default merge is shallow: a persisted slice replaces the
        // whole slice, so keys added to a slice's initial state later would be
        // undefined for anyone with existing storage. Merge per slice instead,
        // so new preferences pick up their defaults without a version bump.
        merge: (persistedState, currentState) => {
          const persisted = (persistedState ?? {}) as Partial<Store>;
          return {
            ...currentState,
            ...persisted,
            app: { ...currentState.app, ...persisted.app },
            tabs: { ...currentState.tabs, ...persisted.tabs },
            ui: { ...currentState.ui, ...persisted.ui },
            wordy: { ...currentState.wordy, ...persisted.wordy },
          };
        },
      },
    ),
    { name: 'Wordy' },
  ),
);
