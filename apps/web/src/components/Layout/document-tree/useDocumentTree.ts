/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';

import * as React from 'react';
import { useLocation } from '@tanstack/react-router';
import { arrayToTree } from '@repo/lib/data/tree';
import { ListDocumentResult } from '@/queries/documents';

export function useDocumentTree(documents?: ListDocumentResult) {
  const isLoading = !documents;

  const filteredDocuments = React.useMemo(
    () => (documents ?? []).filter((d: any) => d.from !== 'manage'),
    [documents],
  );
  const documentsTree = React.useMemo(
    () => arrayToTree(filteredDocuments ?? []),
    [filteredDocuments],
  );
  const { pathname } = useLocation();
  const activeDocumentHandle = decodeURIComponent(pathname.split('/').pop() ?? '');
  const activeDocument = filteredDocuments?.find((d) => d.handle === activeDocumentHandle);
  const [expandedDocuments, setExpandedDocuments] = React.useState<Set<string>>(new Set([]));
  const [openMenuDocumentId, setOpenMenuDocumentId] = React.useState<string | null>(null);

  const getAncestorIds = (documentId?: string, ids: string[] = []): string[] => {
    const doc = filteredDocuments?.find((d) => d.id === documentId);
    if (!doc) return ids;
    if (doc.parentId) {
      getAncestorIds(doc.parentId, ids);
      ids.push(doc.parentId);
    }
    return ids;
  };

  const isExpanded = (documentId: string) => expandedDocuments.has(documentId);

  const handleSelectDocument = (_documentId: string) => {
    // TODO: Implement document selection logic
  };

  const toggleExpanded = (documentId?: string) => {
    if (!documentId) return;
    setExpandedDocuments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(documentId)) {
        newSet.delete(documentId);
      } else {
        newSet.add(documentId);
      }
      return newSet;
    });
  };

  React.useEffect(() => {
    if (isLoading) return;
    const ancestorIds = getAncestorIds(activeDocument?.id);
    setExpandedDocuments((prev) => {
      const newSet = new Set(prev);
      ancestorIds.forEach((id) => newSet.add(id));
      return newSet;
    });
  }, [activeDocument?.id, isLoading, filteredDocuments]);

  return {
    documentsTree,
    activeDocument,
    expandedDocuments,
    openMenuDocumentId,
    isExpanded,
    handleSelectDocument,
    toggleExpanded,
    setOpenMenuDocumentId,
    getAncestorIds,
    isLoading,
  };
}
