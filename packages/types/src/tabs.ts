/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Computed metadata for a tab (title + icon).
 * For static tabs this is set once; for dynamic tabs it serves as the
 * persisted fallback while the query loads.
 */
export interface TabMetadata {
  title: string;
  icon: string | null;
}

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
  /** Transient preview tab (italic title, replaced by next preview-link click in the same pane). */
  isPreview?: boolean;
  /** Whether the tab is currently saving */
  isSaving?: boolean;
  /** Whether the tab was just saved (shows green checkmark animation) */
  isJustSaved?: boolean;
}
