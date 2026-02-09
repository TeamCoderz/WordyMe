/**
 * A tab representing any page in the application
 */
export interface Tab {
  /** Unique identifier for the tab */
  id: string;
  /** The route pathname for this page */
  pathname: string;
  /** Optional search params for the page */
  search?: Record<string, unknown>;
  /** Optional hash for the page */
  hash?: string;
  /** Whether the tab has unsaved changes */
  isDirty: boolean;
}

/**
 * State for the tabs system
 */
export interface TabsState {
  /** Array of open tabs */
  tabs: Tab[];
  /** ID of the currently active tab */
  activeTabId: string | null;
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
}

/**
 * Actions for managing tabs
 */
export interface TabsActions {
  /** Open a new tab or switch to existing tab */
  openTab: (input: OpenTabInput) => string;
  /** Close a specific tab */
  closeTab: (tabId: string) => void;
  /** Close all tabs except the specified one */
  closeOtherTabs: (tabId: string) => void;
  /** Close all tabs */
  closeAllTabs: () => void;
  /** Set the active tab */
  setActiveTab: (tabId: string | null) => void;
  /** Reorder tabs */
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  /** Mark a tab as dirty (has unsaved changes) */
  setTabDirty: (tabId: string, isDirty: boolean) => void;
  /** Update tab information */
  updateTab: (tabId: string, updates: Partial<Pick<Tab, 'pathname' | 'search' | 'hash'>>) => void;
  /** Reset tabs state to initial state */
  resetTabs: () => void;
}

/**
 * Computed metadata for a tab (derived from pathname)
 */
export interface TabMetadata {
  title: string;
  icon: string | null;
}
