/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type {
  CreateDocumentInput,
  CreateDocumentWithRevisionInput,
  DocumentDetails,
  DocumentFilters,
  DocumentListItem,
  GetSingleDocumentOptions,
  PlainDocument,
  UpdateDocumentInput,
} from '@repo/backend/documents.js';
import type { PaginatedResult, PaginationQuery } from '@repo/backend/pagination.js';
import { del, get, patch, post } from './client.js';

export const createDocument = async (data: CreateDocumentInput) => {
  return await post<PlainDocument>('/documents', data);
};

export const createDocumentWithRevision = async (data: CreateDocumentWithRevisionInput) => {
  return await post<DocumentDetails>('/documents/with-revision', data);
};

export const getUserDocuments = async (filters?: DocumentFilters) => {
  return await get<DocumentListItem[]>('/documents', filters);
};

export const getLastViewedDocuments = async (filters?: DocumentFilters & PaginationQuery) => {
  return await get<PaginatedResult<DocumentListItem>>('/documents/last-viewed', filters);
};

export const getDocumentById = async (documentId: string, options?: GetSingleDocumentOptions) => {
  return await get<DocumentDetails>(`/documents/${documentId}`, options);
};

export const getDocumentByHandle = async (handle: string, options?: GetSingleDocumentOptions) => {
  return await get<DocumentDetails>(`/documents/handle/${handle}`, options);
};

export const updateDocument = async (documentId: string, data: UpdateDocumentInput) => {
  return await patch<PlainDocument>(`/documents/${documentId}`, data);
};

export const deleteDocument = async (documentId: string) => {
  return await del(`/documents/${documentId}`);
};
