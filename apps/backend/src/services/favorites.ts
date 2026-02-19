/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { eq, and, count, getTableColumns, gt, max } from 'drizzle-orm';
import { db } from '../lib/db.js';
import { favoritesTable } from '../models/favorites.js';
import { documentsTable } from '../models/documents.js';
import { documentViewsTable } from '../models/document-views.js';
import { PaginatedResult, PaginationQuery } from '../schemas/pagination.js';
import { orderByColumns } from './documents.js';
import { DocumentFilters, DocumentListItem } from '../schemas/documents.js';
import { CollectionQuery } from '../utils/collections.js';
import { emitToUser } from '../lib/socket.js';

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

  const document = await db.query.documentsTable.findFirst({
    columns: { spaceId: true, documentType: true },
    where: eq(documentsTable.id, documentId),
  });

  emitToUser(
    userId,
    document?.documentType === 'space' ? 'space:favorited' : 'document:favorited',
    { ...favorite, spaceId: document?.spaceId ?? null },
  );

  return favorite;
};

export const removeDocumentFromFavorites = async (userId: string, documentId: string) => {
  const [favorite] = await db
    .delete(favoritesTable)
    .where(and(eq(favoritesTable.userId, userId), eq(favoritesTable.documentId, documentId)))
    .returning();

  const document = await db.query.documentsTable.findFirst({
    columns: { spaceId: true, documentType: true },
    where: eq(documentsTable.id, documentId),
  });

  emitToUser(
    userId,
    document?.documentType === 'space' ? 'space:unfavorited' : 'document:unfavorited',
    { ...favorite, spaceId: document?.spaceId ?? null },
  );
  return favorite;
};

export const listFavorites = async (userId: string, filters: DocumentFilters & PaginationQuery) => {
  const query = db
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
    .groupBy(documentsTable.id)
    .$dynamic();

  const orderByColumn = orderByColumns[filters.orderBy ?? 'createdAt'];

  const result = await new CollectionQuery(query)
    .search(documentsTable.name, filters.search)
    .filter(documentsTable.userId, userId)
    .filter(documentsTable.documentType, filters.documentType)
    .filter(documentsTable.spaceId, filters.spaceId)
    .filter(documentsTable.parentId, filters.parentId)
    .order(orderByColumn, filters.order ?? 'desc')
    .getPaginatedResult(filters);

  return result as PaginatedResult<DocumentListItem>;
};
