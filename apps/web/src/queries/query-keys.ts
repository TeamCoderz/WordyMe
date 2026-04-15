/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/** Document-related React Query keys (single source of truth). */
export const DOCUMENTS_QUERY_KEYS = {
  FAVORITES: ['docs', 'favorites'],
  HOME: {
    BASE: ['home', 'docs'],
    FAVORITES: ['home', 'docs', 'favorites'],
    ALL_DOCUMENTS: ['home', 'docs', 'all-documents'],
    RECENT_VIEWS: ['home', 'docs', 'recent-views'],
  },
  RECENT_VIEWS: ['docs', 'recent-viewed'],
  SEARCH_DOCUMENTS: (search: string, spaceId?: string) => ['docs', 'search', { search, spaceId }],

  /** Full hierarchy for a space (`listDocuments`). */
  LIST_BY_SPACE: (spaceId: string) => ['documents', spaceId] as const,

  /** One document loaded by id (third segment distinguishes from handle). */
  DETAIL_BY_ID: (id: string) => ['document', id, { id: true as const }] as const,

  /** One document loaded by handle. */
  DETAIL_BY_HANDLE: (handle: string) => ['document', handle] as const,
};

/** Space document (space entity) query keys. */
export const SPACES_QUERY_KEYS = {
  FAVORITES: ['spaces', 'favorites'],
  HOME: {
    BASE: ['home', 'spaces'],
    FAVORITES: ['home', 'spaces', 'favorites'],
  },
};

/** Revision / local revision query keys. */
export const REVISIONS_QUERY_KEYS = {
  BY_DOCUMENT_ID: (documentId: string) => ['revisions', documentId] as const,
  BY_ID: (revisionId: string) => ['revision', revisionId] as const,
  LOCAL_BY_DOCUMENT_ID: (documentId: string) => ['localDocumentRevision', documentId] as const,
};

/** Auth-related query keys. */
export const AUTH_QUERY_KEYS = {
  SIGNUP_AVAILABILITY: ['auth', 'signupAvailability'] as const,
};

/** Tab / layout query keys. */
export const TABS_QUERY_KEYS = {
  /** Placeholder key when a tab has no registered metadata query. */
  METADATA_NOOP: (tabId: string) => ['tab-metadata-noop', tabId] as const,
};
