import { createStore } from 'zustand/vanilla';
import { devtools, persist } from 'zustand/middleware';
import { queryClient } from '@/App';
import { getAllSpacesQueryOptions } from '@/queries/spaces';
import { createContext } from 'react';
import type { ListDocumentResult } from '@/queries/documents';
import type { ListSpaceResult } from '@/queries/spaces';
import type { TopBarFormValues } from '@/schemas/top-bar-form.schema';
import type { Space, Document, Revision, NavigationConfig, ActiveSpace } from '@repo/types';
import { calculateSpacePath } from '@/utils/calculateSpacePath';
import { EditorSettings } from '@repo/backend/editor-settings.js';
import { SessionData } from '@repo/sdk/auth';

export interface StoreState {
  user:
    | (NonNullable<Omit<NonNullable<SessionData>['user'], 'user_images' | 'editor_settings'>> & {
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
  activeSpace: ActiveSpace | null;
  activeDocument: Document | null;
  topBarSettings: any; // TODO: Add proper type
  instanceSettings: TopBarFormValues | null;
  navigation: NavigationConfig;
  sidebar: 'expanded' | 'collapsed' | 'remember';
  inlineCreate: {
    parentId: string | null;
    type: 'note' | 'folder';
    name: string;
  } | null;
  version: string | null;
  deployment_id: string | null;
}

export interface StoreActions {
  setUser: (user: StoreState['user']) => void;
  setAvatarImage: (avatarImage: NonNullable<StoreState['user']>['avatar_image']) => void;
  setCoverImage: (coverImage: NonNullable<StoreState['user']>['cover_image']) => void;
  setNavigation: (navigation: NavigationConfig) => void;
  setTopBarSettings: (settings: any) => void;
  setActiveSpace: (space: ActiveSpace | null) => void;
  setActiveSpaceBySpaceId: (spaceId: string) => void;
  setActiveDocument: (document: Document | null) => void;
  setDocumentsClipboard: (document: ListDocumentResult[number], type: 'copy' | 'move') => void;
  clearDocumentsClipboard: () => void;
  setSpacesClipboard: (space: ListSpaceResult[number], type: 'copy' | 'move') => void;
  clearSpacesClipboard: () => void;
  // Async actions
  // setInstanceSettingsRemote: (
  //   instanceId: string | undefined,
  //   settings: Partial<TopBarFormValues>,
  // ) => Promise<
  //   | { type: "error"; message: string }
  //   | {
  //       type: "success";
  //       data: InstanceSettingsData;
  //     }
  // >;
  setInstanceSettingsLocal: (settings: TopBarFormValues) => void;
  setInstanceName: (name: string) => void;
  setInstanceLogo: (logo: string) => void;
  setEndColor: (color: string) => void;
  setStartColor: (color: string) => void;
  setTopBarTheme: (theme: string) => void;
  setDirection: (direction: 'right' | 'bottom' | 'left' | 'top') => void;
  setIsGradient: (isGradient: boolean) => void;
  setSidebar: (sidebar: 'expanded' | 'collapsed' | 'remember') => void;
  setInlineCreate: (payload: NonNullable<StoreState['inlineCreate']>) => void;
  clearInlineCreate: () => void;
  setVersion: (version: string) => void;
  setDeploymentId: (deploymentId: string) => void;
}

export type AppStore = StoreState & { actions: StoreActions };

const defaultInitState: StoreState = {
  user: null,
  spaces: [],
  documents: [],
  revisions: [],
  activeSpace: null,
  activeDocument: null,
  topBarSettings: null,
  instanceSettings: null,
  navigation: { secondary: [] },
  documentsClipboard: null,
  spacesClipboard: null,
  sidebar: 'expanded' as StoreState['sidebar'],
  inlineCreate: null,
  version: null,
  deployment_id: null,
};

export const createAppStore = (initState = defaultInitState) => {
  return createStore<AppStore>()(
    devtools(
      persist(
        (set) => ({
          ...initState,
          actions: {
            setSidebar: (sidebar) => set({ sidebar }),
            setInlineCreate: (payload) => set({ inlineCreate: payload }),
            clearInlineCreate: () => set({ inlineCreate: null }),
            setDocumentsClipboard: (document, type) =>
              set({ documentsClipboard: { document, type } }),
            clearDocumentsClipboard: () => set({ documentsClipboard: null }),
            setSpacesClipboard: (space, type) => set({ spacesClipboard: { space, type } }),
            clearSpacesClipboard: () => set({ spacesClipboard: null }),
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
            setNavigation: (navigation) => set({ navigation }),
            setTopBarSettings: (settings) => set({ topBarSettings: settings }),
            setActiveSpace: (space) => set({ activeSpace: space }),
            setActiveSpaceBySpaceId: async (spaceId) => {
              const spaces = await queryClient.ensureQueryData(getAllSpacesQueryOptions);
              if (!spaces) return;
              const space = spaces.find((space) => space.id === spaceId);
              if (space) {
                // Convert spaces array to Space[] format for calculateSpacePath
                const spacesAsSpaceArray: Space[] = spaces.map(
                  (item): Space => ({
                    id: item.id,
                    name: item.name,
                    description: null,
                    createdAt:
                      item.createdAt instanceof Date
                        ? item.createdAt.toISOString()
                        : item.createdAt,
                    updatedAt:
                      item.updatedAt instanceof Date
                        ? item.updatedAt.toISOString()
                        : (item.updatedAt ?? null),
                    icon: item.icon ?? '',
                    parentId: item.parentId ?? null,
                    handle: item.handle ?? null,
                  }),
                );
                const path = calculateSpacePath(spaceId, spacesAsSpaceArray);
                // Convert space to Space format
                const convertedSpace: Space = {
                  id: space.id,
                  name: space.name,
                  description: null,
                  createdAt:
                    space.createdAt instanceof Date
                      ? space.createdAt.toISOString()
                      : space.createdAt,
                  updatedAt:
                    space.updatedAt instanceof Date
                      ? space.updatedAt.toISOString()
                      : (space.updatedAt ?? null),
                  icon: space.icon || 'briefcase',
                  parentId: space.parentId ?? null,
                  handle: space.handle ?? null,
                };
                set({
                  activeSpace: {
                    ...convertedSpace,
                    path,
                  },
                });
              }
            },
            setActiveDocument: (document) => set({ activeDocument: document }),
            // Async actions

            // createSpace: async (space: CreateSpaceInput) => {
            //   const newSpace = await createSpace(space);
            //   set((state) => ({
            //     spaces: [...state.spaces, newSpace],
            //     currentSpaceId: newSpace.id,
            //   }));
            //   return newSpace;
            // },

            // updateSpace: async (payload: {
            //   id: string;
            //   partial: Partial<Space>;
            // }) => {
            //   const updatedSpace = await updateSpace(payload);
            //   set((state) => ({
            //     spaces: state.spaces.map((space) =>
            //       space.id === payload.id ? updatedSpace : space,
            //     ),
            //   }));
            //   return updatedSpace;
            // },

            // deleteSpace: async (id: string) => {
            //   await deleteSpace(id);
            //   set((state) => {
            //     const spacesTree = arrayToTree(state.spaces);
            //     if (!spacesTree) return state;
            //     const space = spacesTree.findNodeById(id);
            //     if (!space) return state;
            //     const idList = space.toArray().map((node) => node.id);
            //     return {
            //       spaces: state.spaces.filter(
            //         (space) => !idList.includes(space.id),
            //       ),
            //       activeSpace: idList.includes(state.activeSpace?.id ?? "")
            //         ? (space.parent?.data ?? state.spaces[0] ?? null)
            //         : state.activeSpace,
            //       documents: state.documents.filter((doc) =>
            //         idList.includes(doc.spaceId ?? ""),
            //       ),
            //     };
            //   });
            //   return id;
            // },

            // setInstanceSettingsRemote: async (instanceId, settings) => {
            //   try {
            //     const { data: updatedSettings, error } =
            //       await updateInstanceSettings(instanceId, settings);
            //     if (error) {
            //       return { type: "error", message: error.message };
            //     }

            //     return {
            //       type: "success",
            //       data: {
            //         instance_name: updatedSettings.instance_name ?? "",
            //         instance_logo: updatedSettings.instance_logo ?? "",
            //         top_bar_theme_color:
            //           updatedSettings.top_bar_theme_color ?? "default",
            //         top_bar_gradient: updatedSettings.top_bar_gradient,
            //         top_bar_gradient_direction:
            //           updatedSettings.top_bar_gradient_direction ?? "right",
            //         top_bar_start_color:
            //           updatedSettings.top_bar_start_color ?? "default",
            //         top_bar_end_color:
            //           updatedSettings.top_bar_end_color ?? "default",
            //       },
            //     };
            //   } catch (error) {
            //     if (error instanceof Error) {
            //       return { type: "error", message: error.message };
            //     }
            //     return { type: "error", message: "Unknown error" };
            //   }
            // },
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
            setVersion: (version) => set({ version }),
            setDeploymentId: (deploymentId) => set({ deployment_id: deploymentId }),
          },
        }),
        {
          partialize: (state) => ({
            activeSpace: state.activeSpace,
            sidebar: state.sidebar,
          }),
          name: 'Wordy',
        },
      ),
      { name: 'Wordy' },
    ),
  );
};

export type AppStoreApi = ReturnType<typeof createAppStore>;
export const AppStoreContext = createContext<AppStoreApi | undefined>(undefined);
