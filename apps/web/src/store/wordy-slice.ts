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
import type { TopBarFormValues } from '@/schemas/top-bar-form.schema';
import type { Space, Document, Revision, ActiveSpace } from '@repo/types';
import type { Store } from './store';

export interface WordyState {
  spaces: Space[];
  documents: Document[];
  revisions: Revision[];
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
  topBarSettings: any; // TODO: Add proper type
  instanceSettings: TopBarFormValues | null;
  inlineCreate: {
    parentId: string | null;
    type: 'note' | 'folder';
    name: string;
  } | null;
  version: string | null;
  deployment_id: string | null;
}

export type WordyActions = {
  setTopBarSettings: (settings: any) => void;
  setActiveSpace: (space: ActiveSpace | null, pane?: 'primary' | 'secondary' | null) => void;
  setActiveSpaceBySpaceId: (spaceId: string, pane?: 'primary' | 'secondary' | null) => void;
  setDocumentsClipboard: (document: ListDocumentResult[number], type: 'copy' | 'move') => void;
  clearDocumentsClipboard: () => void;
  setSpacesClipboard: (space: ListSpaceResult[number], type: 'copy' | 'move') => void;
  clearSpacesClipboard: () => void;
  setInstanceSettingsLocal: (settings: TopBarFormValues) => void;
  setInstanceName: (name: string) => void;
  setInstanceLogo: (logo: string) => void;
  setEndColor: (color: string) => void;
  setStartColor: (color: string) => void;
  setTopBarTheme: (theme: string) => void;
  setDirection: (direction: 'right' | 'bottom' | 'left' | 'top') => void;
  setIsGradient: (isGradient: boolean) => void;
  setInlineCreate: (payload: NonNullable<WordyState['inlineCreate']>) => void;
  clearInlineCreate: () => void;
  setVersion: (version: string) => void;
  setDeploymentId: (deploymentId: string) => void;
};

export type WordySlice = WordyState & {
  wordyActions: WordyActions;
};

const initialState: WordyState = {
  spaces: [],
  documents: [],
  revisions: [],
  documentsClipboard: null,
  spacesClipboard: null,
  activeSpace: {
    primary: null,
    secondary: null,
  },
  topBarSettings: null,
  instanceSettings: null,
  inlineCreate: null,
  version: null,
  deployment_id: null,
};

export const createWordySlice: StateCreator<
  Store,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  [],
  WordySlice
> = (set) => {
  return {
    ...initialState,
    wordyActions: {
      setDocumentsClipboard: (document, type) => set({ documentsClipboard: { document, type } }),
      clearDocumentsClipboard: () => set({ documentsClipboard: null }),
      setSpacesClipboard: (space, type) => set({ spacesClipboard: { space, type } }),
      clearSpacesClipboard: () => set({ spacesClipboard: null }),
      setTopBarSettings: (settings) => set({ topBarSettings: settings }),
      setActiveSpace: (space, pane) =>
        set((state) => ({
          activeSpace: {
            ...state.activeSpace,
            [pane ?? state.tabs.activePane]: space,
          },
        })),
      setActiveSpaceBySpaceId: async (spaceId, pane) => {
        const spaces = await queryClient.ensureQueryData(getAllSpacesQueryOptions);
        if (!spaces) return;
        const space = spaces.find((space) => space.id === spaceId);
        if (space) {
          const path = calculateSpacePath(spaceId, spaces as Space[]);
          set((state) => ({
            activeSpace: {
              ...state.activeSpace,
              [pane ?? state.tabs.activePane]: {
                ...space,
                icon: space.icon || 'briefcase',
                path,
              },
            },
          }));
        }
      },
      setInstanceSettingsLocal: (settings) => {
        set(() => ({
          instanceSettings: settings,
        }));
      },
      setInstanceName: (name: string) => {
        set((state) => ({
          ...state,
          instanceSettings: state.instanceSettings
            ? {
                ...state.instanceSettings,
                instance_name: name,
              }
            : null,
        }));
      },
      setInstanceLogo: (logo: string) => {
        set((state) => ({
          ...state,
          instanceSettings: state.instanceSettings
            ? {
                ...state.instanceSettings,
                instance_logo: logo,
              }
            : null,
        }));
      },
      setEndColor: (color: string) => {
        set((state) => ({
          ...state,
          instanceSettings: state.instanceSettings
            ? {
                ...state.instanceSettings,
                top_bar_end_color: color,
              }
            : null,
        }));
      },
      setStartColor: (color: string) => {
        set((state) => ({
          ...state,
          instanceSettings: state.instanceSettings
            ? {
                ...state.instanceSettings,
                top_bar_start_color: color,
              }
            : null,
        }));
      },
      setTopBarTheme: (theme: string) => {
        set((state) => ({
          ...state,
          instanceSettings: state.instanceSettings
            ? {
                ...state.instanceSettings,
                top_bar_theme_color: theme,
              }
            : null,
        }));
      },
      setDirection: (direction: 'right' | 'bottom' | 'left' | 'top') => {
        set((state) => ({
          ...state,
          instanceSettings: state.instanceSettings
            ? {
                ...state.instanceSettings,
                top_bar_gradient_direction: direction,
              }
            : null,
        }));
      },
      setIsGradient: (isGradient: boolean) => {
        set((state) => ({
          ...state,
          instanceSettings: state.instanceSettings
            ? {
                ...state.instanceSettings,
                ...(isGradient
                  ? {
                      top_bar_gradient: true,
                      top_bar_start_color: 'default',
                      top_bar_end_color: 'default',
                      top_bar_gradient_direction: 'right',
                    }
                  : {
                      top_bar_gradient: false,
                      top_bar_theme_color: 'default',
                    }),
              }
            : null,
        }));
      },
      setInlineCreate: (payload) => set({ inlineCreate: payload }),
      clearInlineCreate: () => set({ inlineCreate: null }),
      setVersion: (version) => set({ version }),
      setDeploymentId: (deploymentId) => set({ deployment_id: deploymentId }),
    },
  };
};
