import { useContext } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/shallow';
import { EditorStoreContext, type EditorStore } from './store';

export const useEditorStore = () => {
  const storeContext = useContext(EditorStoreContext);
  if (!storeContext) {
    throw new Error(`useEditorStore must be used within EditorProvider`);
  }
  return storeContext;
};

export function useSelector<T>(selector: (store: EditorStore) => T): T {
  const storeContext = useContext(EditorStoreContext);

  if (!storeContext) {
    throw new Error(`useEditorStore must be used within EditorProvider`);
  }

  return useStore(storeContext, useShallow(selector));
}

export function useActions() {
  return useSelector((state) => state.actions);
}
