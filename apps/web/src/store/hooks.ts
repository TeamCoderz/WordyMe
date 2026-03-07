import { useStore } from 'zustand';
import { useShallow } from 'zustand/shallow';
import { store, type Store } from './store';

export const useSelector = <T>(selector: (store: Store) => T): T => {
  return useStore(store, useShallow(selector));
};

export const useActions = () => {
  return useSelector((state) => ({
    ...state.userActions,
    ...state.uiActions,
    ...state.wordyActions,
    ...state.tabsActions,
  }));
};

export const useAppStore = () => store;
