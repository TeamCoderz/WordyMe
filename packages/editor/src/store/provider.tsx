/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { type ReactNode, useState } from 'react';
import { EditorStoreContext, createEditorStore } from './store';
import { Services } from './types';

interface EditorProviderProps {
  services?: Services;
  children: ReactNode;
}

export const EditorStoreProvider = ({ services, children }: EditorProviderProps) => {
  const [store] = useState(createEditorStore(services));

  return <EditorStoreContext.Provider value={store}>{children}</EditorStoreContext.Provider>;
};
