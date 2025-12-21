import {
  and,
  count,
  countDistinct,
  eq,
  getTableColumns,
  gt,
  max,
} from "drizzle-orm";
import { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { db } from "../lib/db.js";
import { documentsTable } from "../models/documents.js";
import {
  CreateDocumentInput,
  DocumentIdentifier,
  UpdateDocumentInput,
} from "../schemas/documents.js";
import { appendUniqueSuffix, slugify } from "../utils/strings.js";
import { documentViewsTable } from "../models/document-views.js";
import { favoritesTable } from "../models/favorites.js";
import { DocumentFilters, PaginatedResult } from "../schemas/pagination.js";
import { PaginatedCollectionQuery } from "../utils/collections.js";
import { PlainDocument } from "../schemas/documents.js";

export const orderByColumns: Record<string, SQLiteColumn> = {
  name: documentsTable.name,
  createdAt: documentsTable.createdAt,
  lastViewedAt: documentViewsTable.lastViewedAt,
} satisfies Record<string, SQLiteColumn>;

export const checkExistingDocumentHandle = async (handle: string) => {
  const result = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.handle, handle));
  return result.length > 0;
};

export const getDocumentDetails = async (
  { documentId, handle }: DocumentIdentifier,
  userId: string
) => {
  const document = await db.query.documentsTable.findFirst({
    where: and(
      documentId
        ? eq(documentsTable.id, documentId)
        : eq(documentsTable.handle, handle!),
      eq(documentsTable.userId, userId)
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
    lastViewedAt:
      document.views.length > 0 ? document.views[0].lastViewedAt : null,
  };
};

export const getUserDocuments = async (userId: string) => {
  const documents = await db
    .select({
      ...getTableColumns(documentsTable),
      isFavorite: gt(count(favoritesTable.id), 0),
      lastViewedAt: max(documentViewsTable.lastViewedAt),
    })
    .from(documentsTable)
    .leftJoin(
      favoritesTable,
      and(
        eq(favoritesTable.documentId, documentsTable.id),
        eq(favoritesTable.userId, userId)
      )
    )
    .leftJoin(
      documentViewsTable,
      and(
        eq(documentViewsTable.documentId, documentsTable.id),
        eq(documentViewsTable.userId, userId)
      )
    )
    .where(eq(documentsTable.userId, userId))
    .groupBy(documentsTable.id);
  return documents;
};

export const getLastViewedDocuments = async (
  userId: string,
  filters: DocumentFilters
) => {
  const baseQuery = db
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
        eq(documentViewsTable.userId, userId)
      )
    )
    .leftJoin(
      favoritesTable,
      and(
        eq(favoritesTable.documentId, documentsTable.id),
        eq(favoritesTable.userId, userId)
      )
    )
    .where(eq(documentsTable.userId, userId))
    .groupBy(documentsTable.id)
    .$dynamic();

  const countQuery = db
    .select({ count: countDistinct(documentsTable.id).as("count") })
    .from(documentsTable)
    .innerJoin(
      documentViewsTable,
      and(
        eq(documentViewsTable.documentId, documentsTable.id),
        eq(documentViewsTable.userId, userId)
      )
    )
    .where(eq(documentsTable.userId, userId))
    .$dynamic();

  const orderByColumn = orderByColumns[filters.orderBy ?? "lastViewedAt"];

  const result = await new PaginatedCollectionQuery(
    baseQuery,
    countQuery,
    filters
  )
    .notNull(documentViewsTable.lastViewedAt)
    .lastNDays(documentViewsTable.lastViewedAt, filters.days)
    .search(documentsTable.name, filters.search)
    .filter(documentsTable.documentType, filters.documentType)
    .filter(documentsTable.spaceId, filters.spaceId)
    .filter(documentsTable.parentId, filters.parentId)
    .order(orderByColumn, filters.order ?? "desc")
    .getPaginatedResult();

  return result as PaginatedResult<
    PlainDocument & { isFavorite: boolean; lastViewedAt: Date | null }
  >;
};

export const createDocument = async (
  payload: CreateDocumentInput,
  userId: string
) => {
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

export const updateDocument = async (
  documentId: string,
  payload: UpdateDocumentInput
) => {
  let handle;
  if (payload.name) {
    handle = slugify(payload.name);
    if (await checkExistingDocumentHandle(handle)) {
      handle = appendUniqueSuffix(handle);
    }
  }
  const [document] = await db
    .update(documentsTable)
    .set({ ...payload, handle })
    .where(eq(documentsTable.id, documentId))
    .returning();
  return document;
};

export const deleteDocument = async (documentId: string) => {
  return await db
    .delete(documentsTable)
    .where(eq(documentsTable.id, documentId));
};
