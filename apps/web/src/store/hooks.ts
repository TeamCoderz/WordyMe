/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useStore } from 'zustand';
import { useShallow } from 'zustand/shallow';
import { store, type Store } from './store';

export const useSelector = <T>(selector: (store: Store) => T): T => {
  return useStore(store, useShallow(selector));
};

export const useActions = () => {
  return useSelector((state) => ({
    ...state.appActions,
    ...state.userActions,
    ...state.uiActions,
    ...state.tabsActions,
    ...state.wordyActions,
  }));
};

export const useAppStore = () => store;
