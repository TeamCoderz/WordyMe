import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import z from 'zod';
import { documentsTable } from '../models/documents.js';
import { revisionsTable } from '../models/revisions.js';
import { createRevisionSchema, revisionDetailsSchema } from './revisions.js';

export const documentHandleParamSchema = createSelectSchema(documentsTable).pick({ handle: true });

export const documentIdParamSchema = z.object({
  documentId: z.uuid('Invalid document ID'),
});

export const getSingleDocumentOptionsSchema = z.object({
  updateLastViewed: z
    .union([z.boolean(), z.enum(['true', 'false', '']).transform((val) => val === 'true')])
    .optional(),
});

export const documentFiltersSchema = z.object({
  search: z.string().optional(),
  documentType: z.enum(['space', 'folder', 'note']).optional(),
  spaceId: z.uuid().optional(),
  parentId: z.uuid().optional(),
  orderBy: z.enum(['name', 'createdAt', 'lastViewedAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  isContainer: z.coerce.boolean().optional(),
  days: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).optional(),
});

export const createDocumentSchema = createInsertSchema(documentsTable, {
  documentType: z.enum(['space', 'folder', 'note']),
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
  documentType: z.enum(['space', 'folder', 'note']),
});

export const documentListItemSchema = plainDocumentSchema.extend({
  isFavorite: z.boolean(),
  lastViewedAt: z.date().nullable(),
});

export const documentDetailsSchema = createSelectSchema(documentsTable, {
  documentType: z.enum(['space', 'folder', 'note']),
}).extend({
  currentRevision: createSelectSchema(revisionsTable).nullable(),
  isFavorite: z.boolean(),
  lastViewedAt: z.date().nullable(),
});

export const copiedDocumentSchema = createSelectSchema(documentsTable, {
  documentType: z.enum(['space', 'folder', 'note']),
}).extend({
  currentRevision: revisionDetailsSchema.nullable(),
});

export type DocumentFilters = z.output<typeof documentFiltersSchema>;
export type CreateDocumentInput = z.output<typeof createDocumentSchema>;
export type CreateDocumentWithRevisionInput = z.output<typeof createDocumentWithRevisionSchema>;
export type UpdateDocumentInput = z.output<typeof updateDocumentSchema>;
export type GetSingleDocumentOptions = z.output<typeof getSingleDocumentOptionsSchema>;
export type DocumentListItem = z.output<typeof documentListItemSchema>;
export type DocumentDetails = z.output<typeof documentDetailsSchema>;
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
