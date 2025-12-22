import { and, count, countDistinct, eq, getTableColumns, gt, max } from 'drizzle-orm';
import { SQLiteColumn } from 'drizzle-orm/sqlite-core';
import { db } from '../lib/db.js';
import { documentsTable } from '../models/documents.js';
import {
  CreateDocumentInput,
  DocumentFilters,
  DocumentIdentifier,
  UpdateDocumentInput,
} from '../schemas/documents.js';
import { appendUniqueSuffix, slugify } from '../utils/strings.js';
import { documentViewsTable } from '../models/document-views.js';
import { favoritesTable } from '../models/favorites.js';
import { PaginatedResult, PaginationQuery } from '../schemas/pagination.js';
import { CollectionQuery } from '../utils/collections.js';
import { DocumentListItem } from '../schemas/documents.js';
import { dbWritesQueue } from '../queues/db-writes.js';

export const orderByColumns = {
  name: documentsTable.name,
  createdAt: documentsTable.createdAt,
  lastViewedAt: documentViewsTable.lastViewedAt,
} satisfies Record<string, SQLiteColumn>;

export const checkExistingDocumentHandle = async (handle: string) => {
  const result = await db.select().from(documentsTable).where(eq(documentsTable.handle, handle));
  return result.length > 0;
};

export const getDocumentDetails = async (
  { documentId, handle }: DocumentIdentifier,
  userId: string,
) => {
  const document = await db.query.documentsTable.findFirst({
    where: and(
      documentId ? eq(documentsTable.id, documentId) : eq(documentsTable.handle, handle!),
      eq(documentsTable.userId, userId),
    ),
    with: {
      currentRevision: true,
      views: {
        where: eq(documentViewsTable.userId, userId),
      },
      favorites: {
        where: eq(favoritesTable.userId, userId),
      },
    },
  });

  if (!document) return undefined;
  return {
    ...document,
    isFavorite: document.favorites.length > 0,
    lastViewedAt: document.views.length > 0 ? document.views[0].lastViewedAt : null,
  };
};

export const getUserDocuments = async (
  userId: string,
  filters: DocumentFilters,
): Promise<DocumentListItem[]> => {
  const query = db
    .select({
      ...getTableColumns(documentsTable),
      isFavorite: gt(count(favoritesTable.id), 0),
      lastViewedAt: max(documentViewsTable.lastViewedAt),
    })
    .from(documentsTable)
    .leftJoin(
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

  const result = await new CollectionQuery(query)
    .filter(documentsTable.documentType, filters.documentType)
    .filter(documentsTable.parentId, filters.parentId)
    .filter(documentsTable.spaceId, filters.spaceId)
    .search(documentsTable.name, filters.search)
    .lastNDays(documentViewsTable.lastViewedAt, filters.days)
    .order(orderByColumns[filters.orderBy ?? 'createdAt'], filters.order ?? 'desc')
    .getResult();

  return result as DocumentListItem[];
};

export const getLastViewedDocuments = async (
  userId: string,
  filters: DocumentFilters & PaginationQuery,
) => {
  const query = db
    .select({
      ...getTableColumns(documentsTable),
      isFavorite: gt(count(favoritesTable.id), 0),
      lastViewedAt: max(documentViewsTable.lastViewedAt),
    })
    .from(documentsTable)
    .innerJoin(
      documentViewsTable,
      and(
        eq(documentViewsTable.documentId, documentsTable.id),
        eq(documentViewsTable.userId, userId),
      ),
    )
    .leftJoin(
      favoritesTable,
      and(eq(favoritesTable.documentId, documentsTable.id), eq(favoritesTable.userId, userId)),
    )
    .where(eq(documentsTable.userId, userId))
    .groupBy(documentsTable.id)
    .$dynamic();

  const orderByColumn = orderByColumns[filters.orderBy ?? 'lastViewedAt'];

  const result = await new CollectionQuery(query)
    .notNull(documentViewsTable.lastViewedAt)
    .lastNDays(documentViewsTable.lastViewedAt, filters.days)
    .search(documentsTable.name, filters.search)
    .filter(documentsTable.documentType, filters.documentType)
    .filter(documentsTable.spaceId, filters.spaceId)
    .filter(documentsTable.parentId, filters.parentId)
    .order(orderByColumn, filters.order ?? 'desc')
    .getPaginatedResult(filters);

  return result as PaginatedResult<DocumentListItem>;
};

export const createDocument = async (payload: CreateDocumentInput, userId: string) => {
  let handle = slugify(payload.name);
  if (await checkExistingDocumentHandle(handle)) {
    handle = appendUniqueSuffix(handle);
  }
  return (
    await db
      .insert(documentsTable)
      .values({
        ...payload,
        handle,
        userId,
      })
      .returning()
  )[0];
};

export const viewDocument = async (documentId: string, userId: string) => {
  return await db
    .insert(documentViewsTable)
    .values({ documentId, userId })
    .onConflictDoUpdate({
      target: [documentViewsTable.userId, documentViewsTable.documentId],
      set: { lastViewedAt: new Date() },
    });
};

export const updateDocument = async (documentId: string, payload: UpdateDocumentInput) => {
  let handle;
  if (payload.name) {
    handle = slugify(payload.name);
    if (await checkExistingDocumentHandle(handle)) {
      handle = appendUniqueSuffix(handle);
    }
  }
  if (payload.spaceId) {
    const spaceId = payload.spaceId;
    dbWritesQueue.add(() => updateDocumentSpaceId(documentId, spaceId));
  }
  const [document] = await db
    .update(documentsTable)
    .set({ ...payload, handle })
    .where(eq(documentsTable.id, documentId))
    .returning();
  return document;
};

export const updateDocumentSpaceId = async (documentId: string, spaceId: string) => {
  await db.update(documentsTable).set({ spaceId }).where(eq(documentsTable.id, documentId));

  const children = await db.query.documentsTable.findMany({
    where: eq(documentsTable.parentId, documentId),
  });

  children.forEach((child) => dbWritesQueue.add(() => updateDocumentSpaceId(child.id, spaceId)));
};

export const getUserDocumentCount = async (userId: string): Promise<number> => {
  const userDocuments = await db
    .select({ count: countDistinct(documentsTable.id).as('count') })
    .from(documentsTable)
    .where(eq(documentsTable.userId, userId));

  const [{ count: documentCount }] = userDocuments;
  return documentCount ?? 0;
};

export const deleteDocument = async (documentId: string) => {
  return await db.delete(documentsTable).where(eq(documentsTable.id, documentId));
};
