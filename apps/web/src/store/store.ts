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
        version: 4,
        partialize: (state) => ({
          app: state.app,
          tabs: {
            ...state.tabs,
            tabList: state.tabs.tabList.map(({ isSaving: _s, isJustSaved: _j, ...rest }) => rest),
          },
          ui: state.ui,
          wordy: state.wordy,
        }),
      },
    ),
    { name: 'Wordy' },
  ),
);
