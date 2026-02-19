/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { type ReactNode, useState } from 'react';
import { AppStoreContext, createAppStore } from './app-store';

interface StoreProviderProps {
  children: ReactNode;
}

export const StoreProvider = ({ children }: StoreProviderProps) => {
  const [store] = useState(createAppStore);

  return <AppStoreContext.Provider value={store}>{children}</AppStoreContext.Provider>;
};
