/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { StateCreator } from 'zustand/vanilla';
import type { Store } from './store';
import type { SessionData } from '@repo/sdk/auth';
import type { EditorSettings } from '@repo/backend/editor-settings.ts';

export type UserState =
  | (NonNullable<Omit<NonNullable<SessionData>['user'], 'user_images' | 'editor_settings'>> & {
      id: string;
      email?: string;
      last_signed_in?: string;
      avatar_image?: {
        url: string | null;
        x: number | null;
        y: number | null;
        width: number | null;
        height: number | null;
        zoom: number | null;
        type: 'avatar' | 'cover' | null;
        calculatedImage: string | null;
        isLoading: boolean;
        provider: 'supabase' | 'auth_provider';
      };
      cover_image?: {
        url: string | null;
        x: number | null;
        y: number | null;
        width: number | null;
        height: number | null;
        zoom: number | null;
        type: 'avatar' | 'cover' | null;
        calculatedImage: string | null;
        isLoading: boolean;
      };
      editor_settings: EditorSettings;
      isGuest: boolean;
    })
  | null;
export type UserActions = {
  setUser: (user: UserState) => void;
  setAvatarImage: (avatarImage: NonNullable<UserState>['avatar_image']) => void;
  setCoverImage: (coverImage: NonNullable<UserState>['cover_image']) => void;
};

export type UserSlice = { user: UserState } & {
  userActions: UserActions;
};

const initialState: { user: UserState } = {
  user: null,
};

export const createUserSlice: StateCreator<
  Store,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  [],
  UserSlice
> = (set) => {
  return {
    ...initialState,
    userActions: {
      setUser: (user) => set({ user }),
      setAvatarImage: (avatarImage) =>
        set((s) => {
          if (!s.user) return { user: undefined };
          return {
            user: {
              ...s.user,
              avatar_image: avatarImage,
            },
          };
        }),
      setCoverImage: (coverImage) =>
        set((s) => {
          if (!s.user) return { user: undefined };
          return {
            user: {
              ...s.user,
              cover_image: coverImage,
            },
          };
        }),
    },
  };
};
