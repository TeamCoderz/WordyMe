/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type {
  CreateDocumentInput,
  CreateDocumentWithRevisionInput,
  DocumentDetails,
  DocumentFilters,
  DocumentIdentifier,
  DocumentListItem,
  PlainDocument,
  SearchDocumentResult,
  UpdateDocumentInput,
} from '@repo/backend/documents.js';
import { Pretty } from './utils/pretty';

export type {
  CreateDocumentInput,
  CreateDocumentWithRevisionInput,
  DocumentDetails,
  DocumentFilters,
  DocumentIdentifier,
  DocumentListItem,
  PlainDocument,
  SearchDocumentResult,
  UpdateDocumentInput,
};

export type Document = DocumentListItem;

export type EditorDocument = DocumentDetails;

export interface DocumentStorageUsage {
  id: string;
  name: string;
  size: number;
}

export type ListDocumentRow = Pretty<
  DocumentListItem & {
    from?: 'sidebar' | 'manage';
  }
>;

export type DocumentList = ListDocumentRow[];

export type ListDocumentRenameSignal = ListDocumentRow | { id: null };

export type ListDocumentParentRef = Pick<DocumentListItem, 'spaceId'>;

export type ListDocumentOrParentRef = ListDocumentRow | ListDocumentParentRef;

export type DocumentType = DocumentListItem['documentType'];
