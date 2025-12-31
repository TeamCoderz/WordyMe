import { type ReactNode, useState } from 'react';
import { AppStoreContext, createAppStore } from './app-store';

interface StoreProviderProps {
  children: ReactNode;
}

export const StoreProvider = ({ children }: StoreProviderProps) => {
  const [store] = useState(createAppStore);

  return <AppStoreContext.Provider value={store}>{children}</AppStoreContext.Provider>;
};
