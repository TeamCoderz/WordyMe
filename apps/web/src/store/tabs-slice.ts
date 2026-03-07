/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { StateCreator } from 'zustand/vanilla';
import type { Tab } from '@repo/types';
import type { Store } from './store';
/**
 * State for the tabs system with VS Code-like editor groups (panes).
 * Tabs live in a single flat array. Pane membership and order are tracked
 * by separate ID arrays. Only one pane is "active" at a time.
 */
export interface TabsState {
  /** All open tabs (data store — pathname, isDirty, etc.) */
  tabList: Tab[];
  /** Ordered tab IDs in the primary (left / top) pane */
  primaryTabIds: string[];
  /** Ordered tab IDs in the secondary (right / bottom) pane. Empty = no split. */
  secondaryTabIds: string[];
  /** Selected tab ID per pane */
  activeTabId: {
    primary: string | null;
    secondary: string | null;
  };
  /** Which pane is currently focused */
  activePane: 'primary' | 'secondary';
  /** Persisted split panel ratio (percentage for the first panel, 0-100) */
  splitRatio: number;
}

/**
 * Input for opening a tab
 */
export interface OpenTabInput {
  /** The route pathname for this page */
  pathname: string;
  /** Optional search params for the page */
  search?: Record<string, unknown>;
  /** Optional hash for the page */
  hash?: string;
  /** If true, don't activate the tab after opening */
  background?: boolean;
  /** Which pane to open in (defaults to "primary") */
  pane?: 'primary' | 'secondary' | 'opposite';
  /** Insert at this index within the pane (defaults to end) */
  index?: number;
}

/**
 * Actions for managing tabs
 */
export interface TabsActions {
  /** Open a new tab or switch to existing tab */
  openTab: (input: OpenTabInput) => string;
  /** Close a specific tab (finds its pane automatically) */
  closeTab: (tabId: string) => void;
  /** Close all tabs in the same pane except the specified one */
  closeOtherTabs: (tabId: string) => void;
  /** Close all tabs in all panes */
  closeAllTabs: () => void;
  /** Set the active tab — also sets activePane to its pane */
  setActiveTab: (tabId: string) => void;
  /** Set which pane is focused without changing the selected tab */
  setActivePane: (pane: 'primary' | 'secondary') => void;
  /** Reorder tabs within a specific pane */
  reorderTabs: (pane: 'primary' | 'secondary', fromIndex: number, toIndex: number) => void;
  /** Move a tab from its current pane to the target pane (optional index for insert position) */
  moveTabToPane: (tabId: string, targetPane: 'primary' | 'secondary', index?: number) => void;
  /** Split pane keeping tab in primary, moving all other primary tabs to secondary */
  splitWithTabInPrimary: (tabId: string) => void;
  /** Mark a tab as dirty (has unsaved changes) */
  setTabDirty: (tabId: string, isDirty: boolean) => void;
  /** Update tab information */
  updateTab: (
    tabId: string,
    updates: Partial<Pick<Tab, 'pathname' | 'search' | 'hash' | 'isDirty'>>,
  ) => void;
  /** Reset tabs state to initial state */
  resetTabs: () => void;
  /** Close the split — merge secondary tabs back into primary */
  closeSplit: () => void;
  /** Set the split panel ratio */
  setSplitRatio: (ratio: number) => void;
}

export type TabsSlice = { tabs: TabsState } & {
  tabsActions: TabsActions;
};

const initialState: TabsState = {
  tabList: [],
  primaryTabIds: [],
  secondaryTabIds: [],
  activeTabId: { primary: null, secondary: null },
  activePane: 'primary',
  splitRatio: 50,
};

// Helper to generate unique tab IDs
function generateTabId(): string {
  return `tab_${Math.random().toString(36).substring(2, 9)}`;
}

export const createTabsSlice: StateCreator<
  Store,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  [],
  TabsSlice
> = (set) => {
  return {
    tabs: initialState,
    tabsActions: {
      openTab: (input: OpenTabInput) => {
        let tabId = '';
        set((state) => {
          const pane =
            input.pane === 'opposite'
              ? state.tabs.activePane === 'primary'
                ? 'secondary'
                : 'primary'
              : (input.pane ?? 'primary');

          const splitRatio =
            pane === 'secondary' && state.tabs.secondaryTabIds.length === 0
              ? 50
              : state.tabs.splitRatio;

          // Create new tab
          const newTab: Tab = {
            id: generateTabId(),
            pathname: input.pathname,
            search: input.search,
            hash: input.hash,
            isDirty: false,
          };

          tabId = newTab.id;
          const newTabList = [...state.tabs.tabList, newTab];

          const paneIds =
            pane === 'primary' ? state.tabs.primaryTabIds : state.tabs.secondaryTabIds;
          const insertIndex =
            input.index != null
              ? Math.max(0, Math.min(input.index, paneIds.length))
              : paneIds.length;
          const newPaneIds = [
            ...paneIds.slice(0, insertIndex),
            newTab.id,
            ...paneIds.slice(insertIndex),
          ];

          if (pane === 'secondary') {
            return {
              tabs: {
                ...state.tabs,
                tabList: newTabList,
                secondaryTabIds: newPaneIds,
                ...(input.background
                  ? {}
                  : {
                      activeTabId: {
                        ...state.tabs.activeTabId,
                        secondary: newTab.id,
                      },
                      activePane: 'secondary' as const,
                    }),
                splitRatio,
              },
            };
          }

          return {
            tabs: {
              ...state.tabs,
              tabList: newTabList,
              primaryTabIds: newPaneIds,
              ...(input.background
                ? {}
                : {
                    activeTabId: {
                      ...state.tabs.activeTabId,
                      primary: newTab.id,
                    },
                    activePane: 'primary' as const,
                  }),
              splitRatio,
            },
          };
        });
        return tabId;
      },

      closeTab: (tabId: string) => {
        set((state) => {
          const tab = state.tabs.tabList.find((t) => t.id === tabId);
          if (!tab) return state;

          const newTabList = state.tabs.tabList.filter((t) => t.id !== tabId);
          const inPrimary = state.tabs.primaryTabIds.includes(tabId);
          const inSecondary = state.tabs.secondaryTabIds.includes(tabId);

          let newPrimaryTabIds = state.tabs.primaryTabIds;
          let newSecondaryTabIds = state.tabs.secondaryTabIds;
          const newActiveTabId = { ...state.tabs.activeTabId };
          let newActivePane = state.tabs.activePane;

          if (inPrimary) {
            const idx = newPrimaryTabIds.indexOf(tabId);
            newPrimaryTabIds = newPrimaryTabIds.filter((id) => id !== tabId);

            if (state.tabs.activeTabId.primary === tabId) {
              if (newPrimaryTabIds.length === 0 && newSecondaryTabIds.length > 0) {
                // Promote secondary tabs to primary when primary becomes empty
                newPrimaryTabIds = [...newSecondaryTabIds];
                newSecondaryTabIds = [];
                newActiveTabId.primary = state.tabs.activeTabId.secondary ?? newPrimaryTabIds[0];
                newActiveTabId.secondary = null;
                newActivePane = 'primary';
              } else if (newPrimaryTabIds.length === 0) {
                newActiveTabId.primary = null;
              } else if (idx >= newPrimaryTabIds.length) {
                newActiveTabId.primary = newPrimaryTabIds[newPrimaryTabIds.length - 1];
              } else {
                newActiveTabId.primary = newPrimaryTabIds[idx];
              }
            }
          } else if (inSecondary) {
            const idx = newSecondaryTabIds.indexOf(tabId);
            newSecondaryTabIds = newSecondaryTabIds.filter((id) => id !== tabId);

            if (state.tabs.activeTabId.secondary === tabId) {
              if (newSecondaryTabIds.length === 0) {
                newActiveTabId.secondary = null;
                newActivePane = 'primary';
              } else if (idx >= newSecondaryTabIds.length) {
                newActiveTabId.secondary = newSecondaryTabIds[newSecondaryTabIds.length - 1];
              } else {
                newActiveTabId.secondary = newSecondaryTabIds[idx];
              }
            }
          }

          return {
            tabs: {
              ...state.tabs,
              tabList: newTabList,
              primaryTabIds: newPrimaryTabIds,
              secondaryTabIds: newSecondaryTabIds,
              activeTabId: newActiveTabId,
              activePane: newActivePane,
            },
          };
        });
      },

      closeOtherTabs: (tabId: string) => {
        set((state) => {
          const tabToKeep = state.tabs.tabList.find((t) => t.id === tabId);
          if (!tabToKeep) return state;

          const inPrimary = state.tabs.primaryTabIds.includes(tabId);

          if (inPrimary) {
            const newTabList = state.tabs.tabList.filter(
              (t) => t.id === tabId || state.tabs.secondaryTabIds.includes(t.id),
            );
            return {
              tabs: {
                ...state.tabs,
                tabList: newTabList,
                primaryTabIds: [tabId],
                activeTabId: {
                  ...state.tabs.activeTabId,
                  primary: tabId,
                },
              },
            };
          } else {
            const newTabList = state.tabs.tabList.filter(
              (t) => t.id === tabId || state.tabs.primaryTabIds.includes(t.id),
            );
            return {
              tabs: {
                ...state.tabs,
                tabList: newTabList,
                secondaryTabIds: [tabId],
                activeTabId: {
                  ...state.tabs.activeTabId,
                  secondary: tabId,
                },
              },
            };
          }
        });
      },

      closeAllTabs: () => {
        set((state) => {
          const activePane = state.tabs.activePane;
          const activePaneTabIds =
            activePane === 'primary' ? state.tabs.primaryTabIds : state.tabs.secondaryTabIds;
          return {
            tabs: {
              tabList: state.tabs.tabList.filter((t) => !activePaneTabIds.includes(t.id)),
              primaryTabIds:
                activePane === 'primary' ? state.tabs.secondaryTabIds : state.tabs.primaryTabIds,
              secondaryTabIds: [],
              activeTabId: {
                primary:
                  activePane === 'primary'
                    ? state.tabs.activeTabId.secondary
                    : state.tabs.activeTabId.primary,
                secondary: null,
              },
              activePane: 'primary',
              splitRatio: state.tabs.splitRatio,
            },
          };
        });
      },

      setActiveTab: (tabId: string) => {
        set((state) => {
          const inPrimary = state.tabs.primaryTabIds.includes(tabId);
          const inSecondary = state.tabs.secondaryTabIds.includes(tabId);

          if (inPrimary) {
            return {
              tabs: {
                ...state.tabs,
                activeTabId: {
                  ...state.tabs.activeTabId,
                  primary: tabId,
                },
                activePane: 'primary',
              },
            };
          }
          if (inSecondary) {
            return {
              tabs: {
                ...state.tabs,
                activeTabId: {
                  ...state.tabs.activeTabId,
                  secondary: tabId,
                },
                activePane: 'secondary',
              },
            };
          }
          return state;
        });
      },

      setActivePane: (pane: 'primary' | 'secondary') => {
        set((state) => ({
          tabs: {
            ...state.tabs,
            activePane: pane,
          },
        }));
      },

      reorderTabs: (pane: 'primary' | 'secondary', fromIndex: number, toIndex: number) => {
        set((state) => {
          if (fromIndex === toIndex) return state;

          const ids =
            pane === 'primary' ? [...state.tabs.primaryTabIds] : [...state.tabs.secondaryTabIds];

          if (fromIndex < 0 || fromIndex >= ids.length || toIndex < 0 || toIndex > ids.length) {
            return state;
          }

          const [movedId] = ids.splice(fromIndex, 1);
          ids.splice(toIndex, 0, movedId);

          return {
            tabs: {
              ...state.tabs,
              ...(pane === 'primary' ? { primaryTabIds: ids } : { secondaryTabIds: ids }),
            },
          };
        });
      },

      moveTabToPane: (tabId: string, targetPane: 'primary' | 'secondary', index?: number) => {
        set((state) => {
          const tab = state.tabs.tabList.find((t) => t.id === tabId);
          if (!tab) return state;

          const inPrimary = state.tabs.primaryTabIds.includes(tabId);
          const inSecondary = state.tabs.secondaryTabIds.includes(tabId);

          const splitRatio =
            targetPane === 'secondary' && state.tabs.secondaryTabIds.length === 0
              ? 50
              : state.tabs.splitRatio;

          if (
            (targetPane === 'primary' && inPrimary) ||
            (targetPane === 'secondary' && inSecondary)
          ) {
            return state;
          }

          let newPrimaryTabIds = [...state.tabs.primaryTabIds];
          let newSecondaryTabIds = [...state.tabs.secondaryTabIds];
          const newActiveTabId = { ...state.tabs.activeTabId };

          const insertIndex =
            index != null
              ? Math.max(
                  0,
                  Math.min(
                    index,
                    targetPane === 'primary' ? newPrimaryTabIds.length : newSecondaryTabIds.length,
                  ),
                )
              : undefined;

          if (targetPane === 'secondary') {
            const idx = newPrimaryTabIds.indexOf(tabId);
            newPrimaryTabIds = newPrimaryTabIds.filter((id) => id !== tabId);
            newSecondaryTabIds = [
              ...newSecondaryTabIds.slice(0, insertIndex ?? newSecondaryTabIds.length),
              tabId,
              ...newSecondaryTabIds.slice(insertIndex ?? newSecondaryTabIds.length),
            ];

            if (state.tabs.activeTabId.primary === tabId) {
              if (newPrimaryTabIds.length === 0) {
                newActiveTabId.primary = null;
              } else if (idx >= newPrimaryTabIds.length) {
                newActiveTabId.primary = newPrimaryTabIds[newPrimaryTabIds.length - 1];
              } else {
                newActiveTabId.primary = newPrimaryTabIds[idx];
              }
            }

            newActiveTabId.secondary = tabId;
          } else {
            const idx = newSecondaryTabIds.indexOf(tabId);
            newSecondaryTabIds = newSecondaryTabIds.filter((id) => id !== tabId);
            const primaryInsert = insertIndex ?? newPrimaryTabIds.length;
            newPrimaryTabIds = [
              ...newPrimaryTabIds.slice(0, primaryInsert),
              tabId,
              ...newPrimaryTabIds.slice(primaryInsert),
            ];

            if (state.tabs.activeTabId.secondary === tabId) {
              if (newSecondaryTabIds.length === 0) {
                newActiveTabId.secondary = null;
              } else if (idx >= newSecondaryTabIds.length) {
                newActiveTabId.secondary = newSecondaryTabIds[newSecondaryTabIds.length - 1];
              } else {
                newActiveTabId.secondary = newSecondaryTabIds[idx];
              }
            }

            newActiveTabId.primary = tabId;
          }

          const shouldCloseSplit = newPrimaryTabIds.length === 0;
          if (shouldCloseSplit) {
            return {
              tabs: {
                ...state.tabs,
                primaryTabIds: newSecondaryTabIds,
                secondaryTabIds: [],
                activeTabId: {
                  primary: tabId,
                  secondary: null,
                },
                activePane: 'primary',
              },
            };
          }
          return {
            tabs: {
              ...state.tabs,
              primaryTabIds: newPrimaryTabIds,
              secondaryTabIds: newSecondaryTabIds,
              activeTabId: newActiveTabId,
              activePane: targetPane,
              splitRatio,
            },
          };
        });
      },

      splitWithTabInPrimary: (tabId: string) => {
        set((state) => {
          const tab = state.tabs.tabList.find((t) => t.id === tabId);
          if (!tab) return state;
          if (!state.tabs.primaryTabIds.includes(tabId)) return state;
          if (state.tabs.primaryTabIds.length <= 1) return state;

          const others = state.tabs.primaryTabIds.filter((id) => id !== tabId);
          return {
            tabs: {
              ...state.tabs,
              primaryTabIds: [tabId],
              secondaryTabIds: others,
              activeTabId: {
                primary: tabId,
                secondary: others[0] ?? null,
              },
              activePane: 'primary',
              splitRatio: 50,
            },
          };
        });
      },

      setTabDirty: (tabId: string, isDirty: boolean) => {
        set((state) => {
          const tabIndex = state.tabs.tabList.findIndex((t) => t.id === tabId);
          if (tabIndex === -1) return state;

          const newTabList = [...state.tabs.tabList];
          newTabList[tabIndex] = { ...newTabList[tabIndex], isDirty };

          return {
            tabs: {
              ...state.tabs,
              tabList: newTabList,
            },
          };
        });
      },

      updateTab: (tabId: string, updates: Partial<Pick<Tab, 'pathname' | 'search' | 'hash'>>) => {
        set((state) => {
          const tabIndex = state.tabs.tabList.findIndex((t) => t.id === tabId);
          if (tabIndex === -1) return state;

          const newTabList = [...state.tabs.tabList];
          newTabList[tabIndex] = { ...newTabList[tabIndex], ...updates };

          return {
            tabs: {
              ...state.tabs,
              tabList: newTabList,
            },
          };
        });
      },

      resetTabs: () => {
        set(() => {
          return {
            tabs: {
              tabList: [],
              primaryTabIds: [],
              secondaryTabIds: [],
              activeTabId: {
                primary: null,
                secondary: null,
              },
              activePane: 'primary' as const,
              splitRatio: 100,
            },
          };
        });
      },

      closeSplit: () => {
        set((state) => ({
          tabs: {
            ...state.tabs,
            primaryTabIds: [...state.tabs.primaryTabIds, ...state.tabs.secondaryTabIds],
            secondaryTabIds: [],
            activeTabId: {
              ...state.tabs.activeTabId,
              secondary: null,
            },
            activePane: 'primary',
          },
        }));
      },

      setSplitRatio: (ratio: number) => {
        set((state) => ({
          tabs: {
            ...state.tabs,
            splitRatio: ratio,
          },
        }));
      },
    },
  };
};
