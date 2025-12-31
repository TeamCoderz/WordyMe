import { useContext } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/shallow';
import { AppStoreContext, type AppStore } from './app-store';

export const useAppStore = () => {
  const storeContext = useContext(AppStoreContext);
  if (!storeContext) {
    throw new Error(`useAppStore must be used within StoreProvider`);
  }
  return storeContext;
};

export function useSelector<T>(selector: (store: AppStore) => T): T {
  const storeContext = useContext(AppStoreContext);

  if (!storeContext) {
    throw new Error(`useAppStore must be used within StoreProvider`);
  }

  return useStore(storeContext, useShallow(selector));
}

export function useActions() {
  return useSelector((state) => state.actions);
}
