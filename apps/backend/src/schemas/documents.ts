/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import z from 'zod';
import {
  documentsTable,
  documentTypes,
  DocumentType,
  nonPdfDocumentTypes,
} from '../models/documents.js';
import { revisionsTable } from '../models/revisions.js';
import { createRevisionSchema, revisionDetailsSchema } from './revisions.js';

export const documentHandleParamSchema = createSelectSchema(documentsTable).pick({ handle: true });

export const documentIdParamSchema = z.object({
  documentId: z.uuid('Invalid document ID'),
});

export const getSingleDocumentOptionsSchema = z.object({
  updateLastViewed: z.stringbool().optional(),
});

export const documentFiltersSchema = z.object({
  search: z.string().optional(),
  documentType: z.enum(documentTypes).optional(),
  spaceId: z.uuid().optional(),
  parentId: z.uuid().optional(),
  orderBy: z.enum(['name', 'createdAt', 'lastViewedAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  isContainer: z.stringbool().optional(),
  days: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).optional(),
});

export const searchDocumentsQuerySchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  limit: z.coerce.number().min(1).max(50).optional(),
  spaceId: z.uuid().optional(),
});

export const searchDocumentResultSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  snippet: z.string(),
  score: z.number(),
});

export const createDocumentSchema = createInsertSchema(documentsTable, {
  documentType: z.enum(nonPdfDocumentTypes),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  currentRevisionId: true,
  handle: true,
});

export const createDocumentWithRevisionSchema = createDocumentSchema.extend({
  revision: createRevisionSchema.omit({ documentId: true }),
});

export const createPdfDocumentSchema = z.object({
  name: z.coerce.string().min(1),
  parentId: z.coerce.string().pipe(z.uuid()).optional(),
  spaceId: z.coerce.string().pipe(z.uuid()).optional(),
  icon: z.coerce.string().optional(),
  position: z.coerce.string().optional(),
  clientId: z.coerce.string().optional(),
});

export const updateDocumentSchema = createUpdateSchema(documentsTable).omit({
  id: true,
  userId: true,
  clientId: true,
  createdAt: true,
  updatedAt: true,
  handle: true,
  isContainer: true,
  documentType: true,
});

export const plainDocumentSchema = createSelectSchema(documentsTable, {
  documentType: z.enum(documentTypes),
});

export const documentListItemSchema = plainDocumentSchema.extend({
  isFavorite: z.boolean(),
  lastViewedAt: z.date().nullable(),
  pdfUrl: z.string().nullable(),
});

export const documentDetailsSchema = createSelectSchema(documentsTable, {
  documentType: z.enum(documentTypes),
}).extend({
  currentRevision: createSelectSchema(revisionsTable).nullable(),
  isFavorite: z.boolean(),
  lastViewedAt: z.date().nullable(),
  pdfUrl: z.string().nullable(),
});

export const copiedDocumentSchema = createSelectSchema(documentsTable, {
  documentType: z.enum(documentTypes),
}).extend({
  currentRevision: revisionDetailsSchema.nullable(),
  pdfUrl: z.string().nullable(),
});

export type DocumentFilters = z.output<typeof documentFiltersSchema>;
export type CreateDocumentInput = Omit<z.output<typeof createDocumentSchema>, 'documentType'> & {
  documentType: DocumentType;
};
export type CreateDocumentWithRevisionInput = Omit<
  z.output<typeof createDocumentWithRevisionSchema>,
  'documentType'
> & {
  documentType: DocumentType;
};
export type CreatePdfDocumentInput = z.output<typeof createPdfDocumentSchema>;
export type UpdateDocumentInput = z.output<typeof updateDocumentSchema>;
export type GetSingleDocumentOptions = z.output<typeof getSingleDocumentOptionsSchema>;
export type DocumentListItem = z.output<typeof documentListItemSchema>;
export type DocumentDetails = z.output<typeof documentDetailsSchema>;
export type SearchDocumentsQuery = z.output<typeof searchDocumentsQuerySchema>;
export type SearchDocumentResult = z.output<typeof searchDocumentResultSchema>;
export type PlainDocument = Omit<
  DocumentDetails,
  'currentRevision' | 'views' | 'favorites' | 'isFavorite' | 'lastViewedAt'
>;
export type DocumentIdentifier =
  | {
      documentId: string;
      handle?: undefined;
    }
  | {
      documentId?: undefined;
      handle: string;
    };
