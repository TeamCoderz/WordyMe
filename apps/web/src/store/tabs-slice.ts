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
  /** Ordered tab IDs */
  paneTabIds: Record<'primary' | 'secondary', string[]>;
  /** Selected tab ID per pane */
  activeTabId: Record<'primary' | 'secondary', string | null>;
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
  /** If true, open as a preview tab (or replace an existing preview tab in the target pane). */
  preview?: boolean;
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
  /** Close all tabs to the right of the specified tab in the same pane */
  closeTabsToRight: (tabId: string) => void;
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
    updates: Partial<Pick<Tab, 'pathname' | 'search' | 'hash' | 'isDirty' | 'isPreview'>>,
  ) => void;
  /** Promote a preview tab to permanent (clears isPreview). No-op if not preview or not found. */
  promoteTab: (tabId: string) => void;
  /** Reset tabs state to initial state */
  resetTabs: () => void;
  /** Close the split — merge secondary tabs back into primary */
  closeSplit: () => void;
  /** Set the split panel ratio */
  setSplitRatio: (ratio: number) => void;
}

export type TabsSlice = { tabs: TabsState; tabsActions: TabsActions };

const initialState: TabsState = {
  tabList: [],
  paneTabIds: { primary: [], secondary: [] },
  activeTabId: { primary: null, secondary: null },
  activePane: 'primary',
  splitRatio: 100,
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
            pane === 'secondary' && state.tabs.paneTabIds.secondary.length === 0
              ? 50
              : state.tabs.splitRatio;

          if (input.preview) {
            const targetPaneIds = state.tabs.paneTabIds[pane];
            const existingPreview = state.tabs.tabList.find(
              (t) => t.isPreview && targetPaneIds.includes(t.id),
            );
            if (existingPreview) {
              const newTabList = state.tabs.tabList.map((t) =>
                t.id === existingPreview.id
                  ? {
                      ...t,
                      pathname: input.pathname,
                      search: input.search,
                      hash: input.hash,
                      isDirty: false,
                      isPreview: true,
                    }
                  : t,
              );
              tabId = existingPreview.id;
              return {
                tabs: {
                  ...state.tabs,
                  tabList: newTabList,
                  ...(input.background
                    ? {}
                    : {
                        activeTabId: { ...state.tabs.activeTabId, [pane]: existingPreview.id },
                        activePane: pane,
                      }),
                  splitRatio,
                },
              };
            }
          }

          // Create new tab
          const newTab: Tab = {
            id: generateTabId(),
            pathname: input.pathname,
            search: input.search,
            hash: input.hash,
            isDirty: false,
            ...(input.preview ? { isPreview: true } : {}),
          };

          tabId = newTab.id;
          const newTabList = [...state.tabs.tabList, newTab];

          const paneIds = state.tabs.paneTabIds[pane];
          const insertIndex =
            input.index != null
              ? Math.max(0, Math.min(input.index, paneIds.length))
              : paneIds.length;
          const newPaneIds = [
            ...paneIds.slice(0, insertIndex),
            newTab.id,
            ...paneIds.slice(insertIndex),
          ];

          return {
            tabs: {
              ...state.tabs,
              tabList: newTabList,
              paneTabIds: { ...state.tabs.paneTabIds, [pane]: newPaneIds },
              ...(input.background
                ? {}
                : {
                    activeTabId: {
                      ...state.tabs.activeTabId,
                      [pane]: newTab.id,
                    },
                    activePane: pane,
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
          const pane = state.tabs.paneTabIds.primary.includes(tabId) ? 'primary' : 'secondary';
          const newTabList = state.tabs.tabList.filter((t) => t.id !== tabId);
          const newPaneTabIds = { ...state.tabs.paneTabIds };
          const newActiveTabId = { ...state.tabs.activeTabId };

          const index = newPaneTabIds[pane].indexOf(tabId);
          newPaneTabIds[pane] = [
            ...newPaneTabIds[pane].slice(0, index),
            ...newPaneTabIds[pane].slice(index + 1),
          ];
          if (newPaneTabIds.primary.length === 0) {
            newPaneTabIds.primary = [...newPaneTabIds.secondary];
            newPaneTabIds.secondary = [];
            newActiveTabId.primary =
              newActiveTabId.secondary ??
              newPaneTabIds.primary[newPaneTabIds.primary.length - 1] ??
              null;
            newActiveTabId.secondary = null;
          }

          if (tabId === state.tabs.activeTabId[pane]) {
            newActiveTabId[pane] =
              newPaneTabIds[pane][index] ?? newPaneTabIds[pane][index - 1] ?? null;
          }

          const newActivePane =
            newPaneTabIds.secondary.length === 0 ? 'primary' : state.tabs.activePane;
          return {
            tabs: {
              ...state.tabs,
              tabList: newTabList,
              paneTabIds: newPaneTabIds,
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

          const pane = state.tabs.paneTabIds.primary.includes(tabId) ? 'primary' : 'secondary';
          const oppositePane = pane === 'primary' ? 'secondary' : 'primary';
          const newTabList = state.tabs.tabList.filter(
            (t) => t.id === tabId || state.tabs.paneTabIds[oppositePane].includes(t.id),
          );
          return {
            tabs: {
              ...state.tabs,
              tabList: newTabList,
              paneTabIds: { ...state.tabs.paneTabIds, [pane]: [tabId] },
              activeTabId: {
                ...state.tabs.activeTabId,
                [pane]: tabId,
              },
            },
          };
        });
      },

      closeTabsToRight: (tabId: string) => {
        set((state) => {
          const tabToKeep = state.tabs.tabList.find((t) => t.id === tabId);
          if (!tabToKeep) return state;

          const pane = state.tabs.paneTabIds.primary.includes(tabId) ? 'primary' : 'secondary';
          const paneTabIds = state.tabs.paneTabIds[pane];
          const tabIndex = paneTabIds.indexOf(tabId);
          if (tabIndex === -1 || tabIndex === paneTabIds.length - 1) return state;

          const tabsToClose = new Set(paneTabIds.slice(tabIndex + 1));
          const newPaneTabIds = {
            ...state.tabs.paneTabIds,
            [pane]: paneTabIds.slice(0, tabIndex + 1),
          };
          const newActiveTabId = {
            ...state.tabs.activeTabId,
            [pane]: tabsToClose.has(state.tabs.activeTabId[pane] ?? '')
              ? tabId
              : state.tabs.activeTabId[pane],
          };

          return {
            tabs: {
              ...state.tabs,
              tabList: state.tabs.tabList.filter((t) => !tabsToClose.has(t.id)),
              paneTabIds: newPaneTabIds,
              activeTabId: newActiveTabId,
            },
          };
        });
      },

      closeAllTabs: () => {
        set((state) => {
          const activePane = state.tabs.activePane;
          const activePaneTabIds = state.tabs.paneTabIds[activePane];
          return {
            tabs: {
              tabList: state.tabs.tabList.filter((t) => !activePaneTabIds.includes(t.id)),
              paneTabIds: {
                primary:
                  activePane === 'primary'
                    ? state.tabs.paneTabIds.secondary
                    : state.tabs.paneTabIds.primary,
                secondary: [],
              },
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
          const pane = state.tabs.paneTabIds.primary.includes(tabId) ? 'primary' : 'secondary';

          return {
            tabs: {
              ...state.tabs,
              activeTabId: {
                ...state.tabs.activeTabId,
                [pane]: tabId,
              },
              activePane: pane,
            },
          };
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

          const paneTabIds = [...state.tabs.paneTabIds[pane]];
          if (
            fromIndex < 0 ||
            fromIndex >= paneTabIds.length ||
            toIndex < 0 ||
            toIndex > paneTabIds.length
          ) {
            return state;
          }
          const [movedId] = paneTabIds.splice(fromIndex, 1);
          paneTabIds.splice(toIndex, 0, movedId);

          return {
            tabs: {
              ...state.tabs,
              paneTabIds: { ...state.tabs.paneTabIds, [pane]: paneTabIds },
            },
          };
        });
      },

      moveTabToPane: (tabId: string, targetPane: 'primary' | 'secondary', index?: number) => {
        set((state) => {
          const tab = state.tabs.tabList.find((t) => t.id === tabId);
          if (!tab) return state;

          const inPrimary = state.tabs.paneTabIds.primary.includes(tabId);
          const inSecondary = state.tabs.paneTabIds.secondary.includes(tabId);

          if (
            (targetPane === 'primary' && inPrimary) ||
            (targetPane === 'secondary' && inSecondary)
          ) {
            return state;
          }

          const oppositePane = targetPane === 'primary' ? 'secondary' : 'primary';
          const splitRatio =
            targetPane === 'secondary' && state.tabs.paneTabIds.secondary.length === 0
              ? 50
              : state.tabs.splitRatio;

          const newPaneTabIds = { ...state.tabs.paneTabIds };

          const newActiveTabId = { ...state.tabs.activeTabId };

          const fromIndex = state.tabs.paneTabIds[oppositePane].indexOf(tabId);

          const toIndex =
            index != null
              ? Math.max(0, Math.min(index, state.tabs.paneTabIds[targetPane].length))
              : state.tabs.paneTabIds[targetPane].length;

          newPaneTabIds[oppositePane] = newPaneTabIds[oppositePane].filter((id) => id !== tabId);
          newPaneTabIds[targetPane].splice(toIndex, 0, tabId);
          newActiveTabId[targetPane] = tabId;
          newActiveTabId[oppositePane] =
            newPaneTabIds[oppositePane][fromIndex] ??
            newPaneTabIds[oppositePane][fromIndex - 1] ??
            null;

          if (newPaneTabIds.primary.length === 0) {
            const homeTab: Tab = {
              id: generateTabId(),
              pathname: '/',
              isDirty: false,
            };
            return {
              tabs: {
                tabList: [...state.tabs.tabList, homeTab],
                paneTabIds: { ...newPaneTabIds, primary: [homeTab.id] },
                activeTabId: {
                  ...newActiveTabId,
                  primary: homeTab.id,
                },
                activePane: targetPane,
                splitRatio: 50,
              },
            };
          }
          return {
            tabs: {
              ...state.tabs,
              paneTabIds: newPaneTabIds,
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
          if (!state.tabs.paneTabIds.primary.includes(tabId)) return state;
          if (state.tabs.paneTabIds.primary.length <= 1) return state;

          const others = state.tabs.paneTabIds.primary.filter((id) => id !== tabId);
          const secondaryActiveTabId = others.includes(state.tabs.activeTabId.primary ?? '')
            ? state.tabs.activeTabId.primary
            : (others[0] ?? null);
          return {
            tabs: {
              ...state.tabs,
              paneTabIds: { primary: [tabId], secondary: others },
              activeTabId: {
                primary: tabId,
                secondary: secondaryActiveTabId,
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
          newTabList[tabIndex] = {
            ...newTabList[tabIndex],
            isDirty,
          };

          return {
            tabs: {
              ...state.tabs,
              tabList: newTabList,
            },
          };
        });
      },

      updateTab: (
        tabId: string,
        updates: Partial<Pick<Tab, 'pathname' | 'search' | 'hash' | 'isDirty' | 'isPreview'>>,
      ) => {
        set((state) => {
          const tabIndex = state.tabs.tabList.findIndex((t) => t.id === tabId);
          if (tabIndex === -1) return state;

          const newTabList = [...state.tabs.tabList];
          const current = newTabList[tabIndex];
          const nextPathname = updates.pathname ?? current.pathname;
          const shouldPromote = current.isPreview && nextPathname.startsWith('/edit/');
          newTabList[tabIndex] = {
            ...current,
            ...updates,
            ...(shouldPromote ? { isPreview: false } : {}),
          };

          return {
            tabs: {
              ...state.tabs,
              tabList: newTabList,
            },
          };
        });
      },

      promoteTab: (tabId: string) => {
        set((state) => {
          const idx = state.tabs.tabList.findIndex((t) => t.id === tabId);
          if (idx === -1) return state;
          const tab = state.tabs.tabList[idx];
          if (!tab.isPreview) return state;
          const newTabList = [...state.tabs.tabList];
          newTabList[idx] = { ...tab, isPreview: false };
          return { tabs: { ...state.tabs, tabList: newTabList } };
        });
      },

      resetTabs: () => {
        set(() => {
          return { tabs: initialState };
        });
      },

      closeSplit: () => {
        set((state) => ({
          tabs: {
            ...state.tabs,
            paneTabIds: {
              primary: [...state.tabs.paneTabIds.primary, ...state.tabs.paneTabIds.secondary],
              secondary: [],
            },
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
