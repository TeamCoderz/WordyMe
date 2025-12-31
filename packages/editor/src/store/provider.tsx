import { type ReactNode, useState } from 'react';
import { EditorStoreContext, createEditorStore } from './store';
import { Services } from './types';

interface EditorProviderProps {
  services: Services;
  children: ReactNode;
}

export const EditorStoreProvider = ({ services, children }: EditorProviderProps) => {
  const [store] = useState(createEditorStore(services));

  return <EditorStoreContext.Provider value={store}>{children}</EditorStoreContext.Provider>;
};
