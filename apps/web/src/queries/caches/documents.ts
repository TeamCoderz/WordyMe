/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export const cachedDocuments = new Map<string, 'sidebar' | 'manage' | 'real-time'>([]);

export function isDocumentCached(documentId: string | null) {
  if (documentId) {
    return cachedDocuments.has(documentId);
  }
  return false;
}
export const addDocumentToCache = (
  documentId: string | null,
  from: 'sidebar' | 'manage' | 'real-time',
) => {
  if (documentId) {
    cachedDocuments.set(documentId, from);
  }
};
export const removeDocumentFromCache = (documentId: string | null) => {
  if (documentId) {
    cachedDocuments.delete(documentId);
  }
};
