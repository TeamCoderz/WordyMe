/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type {
  CopyDocumentInput,
  ExportedDocument,
  ImportDocumentInput,
} from '@repo/backend/operations.js';
import type { PlainDocument } from '@repo/backend/documents.js';
import { patch, post } from './client.js';

export const copyDocument = async (documentId: string, payload: CopyDocumentInput) => {
  return await post<PlainDocument>(`/documents/${documentId}/copy`, payload);
};

export const moveDocument = async (
  documentId: string,
  payload: Omit<CopyDocumentInput, 'name'>,
) => {
  return await patch<PlainDocument>(`/documents/${documentId}`, payload);
};

export const exportDocument = async (documentId: string) => {
  return await post<ExportedDocument>(`/documents/${documentId}/export`);
};

export const importDocument = async (payload: ImportDocumentInput) => {
  return await post<PlainDocument>('/documents/import', payload);
};
