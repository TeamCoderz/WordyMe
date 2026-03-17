/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { StateCreator } from 'zustand/vanilla';
import { queryClient } from '@/App';
import { getAllSpacesQueryOptions } from '@/queries/spaces';
import { calculateSpacePath } from '@/utils/calculateSpacePath';
import type { ListDocumentResult } from '@/queries/documents';
import type { ListSpaceResult } from '@/queries/spaces';
import type { Space, ActiveSpace } from '@repo/types';
import type { Store } from './store';

export interface WordyState {
  documentsClipboard: {
    document: ListDocumentResult[number];
    type: 'copy' | 'move';
  } | null;
  spacesClipboard: {
    space: ListSpaceResult[number];
    type: 'copy' | 'move';
  } | null;
  activeSpace: {
    primary: ActiveSpace | null;
    secondary: ActiveSpace | null;
  };
  inlineCreate: {
    parentId: string | null;
    type: 'note' | 'folder';
    name: string;
  } | null;
}

export type WordyActions = {
  setTopBarSettings: (settings: any) => void;
  setActiveSpace: (space: ActiveSpace | null, pane?: 'primary' | 'secondary' | null) => void;
  setActiveSpaceBySpaceId: (spaceId: string, pane?: 'primary' | 'secondary' | null) => void;
  setDocumentsClipboard: (document: ListDocumentResult[number], type: 'copy' | 'move') => void;
  clearDocumentsClipboard: () => void;
  setSpacesClipboard: (space: ListSpaceResult[number], type: 'copy' | 'move') => void;
  clearSpacesClipboard: () => void;
  setInlineCreate: (payload: NonNullable<WordyState['inlineCreate']>) => void;
  clearInlineCreate: () => void;
};

export type WordySlice = { wordy: WordyState; wordyActions: WordyActions };

const initialState: WordyState = {
  documentsClipboard: null,
  spacesClipboard: null,
  activeSpace: {
    primary: null,
    secondary: null,
  },
  inlineCreate: null,
};

export const createWordySlice: StateCreator<
  Store,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  [],
  WordySlice
> = (set) => {
  return {
    wordy: initialState,
    wordyActions: {
      setDocumentsClipboard: (document, type) =>
        set((state) => ({
          wordy: { ...state.wordy, documentsClipboard: { document, type } },
        })),
      clearDocumentsClipboard: () =>
        set((state) => ({
          wordy: { ...state.wordy, documentsClipboard: null },
        })),
      setSpacesClipboard: (space, type) =>
        set((state) => ({
          wordy: { ...state.wordy, spacesClipboard: { space, type } },
        })),
      clearSpacesClipboard: () =>
        set((state) => ({ wordy: { ...state.wordy, spacesClipboard: null } })),
      setTopBarSettings: (settings) =>
        set((state) => ({
          wordy: { ...state.wordy, topBarSettings: settings },
        })),
      setActiveSpace: (space, pane) =>
        set((state) => ({
          wordy: {
            ...state.wordy,
            activeSpace: {
              ...state.wordy.activeSpace,
              [pane ?? state.tabs.activePane]: space,
            },
          },
        })),
      setActiveSpaceBySpaceId: async (spaceId, pane) => {
        const spaces = await queryClient.ensureQueryData(getAllSpacesQueryOptions);
        if (!spaces) return;
        const space = spaces.find((space) => space.id === spaceId);
        if (space) {
          const path = calculateSpacePath(spaceId, spaces as Space[]);
          set((state) => ({
            wordy: {
              ...state.wordy,
              activeSpace: {
                ...state.wordy.activeSpace,
                [pane ?? state.tabs.activePane]: {
                  ...space,
                  icon: space.icon || 'briefcase',
                  path,
                },
              },
            },
          }));
        }
      },
      setInlineCreate: (payload) =>
        set((state) => ({ wordy: { ...state.wordy, inlineCreate: payload } })),
      clearInlineCreate: () => set((state) => ({ wordy: { ...state.wordy, inlineCreate: null } })),
    },
  };
};
