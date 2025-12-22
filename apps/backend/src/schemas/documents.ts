import { createSelectSchema } from 'drizzle-zod';
import z from 'zod';
import { documentsTable } from '../models/documents.js';
import { revisionsTable } from '../models/revisions.js';
import { documentViewsTable } from '../models/document-views.js';
import { favoritesTable } from '../models/favorites.js';

export const documentIdParamSchema = z.object({
  documentId: z.uuid('Invalid document ID'),
});

export const getSingleDocumentOptionsSchema = z.object({
  updateLastViewed: z.stringbool().optional(),
});

export type GetSingleDocumentOptions = z.output<typeof getSingleDocumentOptionsSchema>;

export const documentFiltersSchema = z.object({
  search: z.string().optional(),
  documentType: z.enum(['space', 'folder', 'note']).optional(),
  spaceId: z.uuid().optional(),
  parentId: z.uuid().optional(),
  orderBy: z.enum(['name', 'createdAt', 'lastViewedAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  days: z.coerce.number().min(1).optional(),
});

export type DocumentFilters = z.output<typeof documentFiltersSchema>;

export const documentHandleParamSchema = z.object({
  handle: z.string().min(1, 'Handle is required'),
});

export type DocumentIdentifier =
  | {
      documentId: string;
      handle?: undefined;
    }
  | {
      documentId?: undefined;
      handle: string;
    };

export const createDocumentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  icon: z.string().nullish(),
  position: z.string().nullish(),
  parentId: z.uuid().nullish(),
  spaceId: z.uuid().nullish(),
  documentType: z.enum(['space', 'folder', 'note']),
  clientId: z.string().optional(),
  isContainer: z.boolean().optional(),
});

export type CreateDocumentInput = z.output<typeof createDocumentSchema>;

export const updateDocumentSchema = createDocumentSchema.partial();

export type UpdateDocumentInput = z.output<typeof updateDocumentSchema>;

export const documentDetailsSchema = createSelectSchema(documentsTable).extend({
  currentRevision: createSelectSchema(revisionsTable).nullable(),
  views: z.array(createSelectSchema(documentViewsTable)).optional(),
  favorites: z.array(createSelectSchema(favoritesTable)).optional(),
  isFavorite: z.boolean(),
  lastViewedAt: z.date().nullable(),
});

export type DocumentDetails = z.output<typeof documentDetailsSchema>;

export type PlainDocument = Omit<
  DocumentDetails,
  'currentRevision' | 'views' | 'favorites' | 'isFavorite' | 'lastViewedAt'
>;

export type DocumentListItem = PlainDocument & {
  isFavorite: boolean;
  lastViewedAt: Date | null;
};
