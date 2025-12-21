import { eq, and, count, countDistinct, getTableColumns, gt, max } from 'drizzle-orm';
import { db } from '../lib/db.js';
import { favoritesTable } from '../models/favorites.js';
import { documentsTable } from '../models/documents.js';
import { documentViewsTable } from '../models/document-views.js';
import { PaginatedResult, PaginationQuery } from '../schemas/pagination.js';
import { PaginatedCollectionQuery } from '../utils/collections.js';
import { orderByColumns } from './documents.js';
import { DocumentFilters, DocumentListItem } from '../schemas/documents.js';

export const addDocumentToFavorites = async (userId: string, documentId: string) => {
  const [favorite] = await db
    .insert(favoritesTable)
    .values({ userId, documentId })
    .onConflictDoUpdate({
      target: [favoritesTable.userId, favoritesTable.documentId],
      set: { updatedAt: new Date() },
    })
    .returning({
      id: favoritesTable.id,
      documentId: favoritesTable.documentId,
      userId: favoritesTable.userId,
    });

  return favorite ?? null;
};

export const removeDocumentFromFavorites = async (userId: string, documentId: string) => {
  const result = await db
    .delete(favoritesTable)
    .where(and(eq(favoritesTable.userId, userId), eq(favoritesTable.documentId, documentId)));

  return result;
};

export const listFavorites = async (
  userId: string,
  filters: DocumentFilters & PaginationQuery,
): Promise<PaginatedResult<DocumentListItem>> => {
  const baseQuery = db
    .select({
      ...getTableColumns(documentsTable),
      isFavorite: gt(count(favoritesTable.id), 0),
      lastViewedAt: max(documentViewsTable.lastViewedAt),
    })
    .from(documentsTable)
    .innerJoin(
      favoritesTable,
      and(eq(favoritesTable.documentId, documentsTable.id), eq(favoritesTable.userId, userId)),
    )
    .leftJoin(
      documentViewsTable,
      and(
        eq(documentViewsTable.documentId, documentsTable.id),
        eq(documentViewsTable.userId, userId),
      ),
    )
    .where(eq(documentsTable.userId, userId))
    .groupBy(documentsTable.id)
    .$dynamic();

  const countQuery = db
    .select({ count: countDistinct(documentsTable.id).as('count') })
    .from(documentsTable)
    .innerJoin(
      favoritesTable,
      and(eq(favoritesTable.documentId, documentsTable.id), eq(favoritesTable.userId, userId)),
    )
    .where(eq(documentsTable.userId, userId))
    .$dynamic();

  const orderByColumn = orderByColumns[filters.orderBy ?? 'createdAt'];

  const result = await new PaginatedCollectionQuery(baseQuery, countQuery, filters)
    .search(documentsTable.name, filters.search)
    .filter(documentsTable.documentType, filters.documentType)
    .filter(documentsTable.spaceId, filters.spaceId)
    .filter(documentsTable.parentId, filters.parentId)
    .order(orderByColumn, filters.order ?? 'desc')
    .getPaginatedResult();

  return result as PaginatedResult<DocumentListItem>;
};
