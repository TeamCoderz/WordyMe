/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { and, count, countDistinct, eq, getTableColumns, gt, max } from 'drizzle-orm';
import { SQLiteColumn } from 'drizzle-orm/sqlite-core';
import { db } from '../lib/db.js';
import { documentsTable } from '../models/documents.js';
import {
  CreateDocumentInput,
  CreateDocumentWithRevisionInput,
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
import { emitToSpace, emitToUser } from '../lib/socket.js';
import { revisionsTable } from '../models/revisions.js';
import { saveRevisionContent } from './revision-contents.js';

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
    .groupBy(documentsTable.id)
    .$dynamic();

  const result = await new CollectionQuery(query)
    .filter(documentsTable.userId, userId)
    .filter(documentsTable.documentType, filters.documentType)
    .filter(documentsTable.parentId, filters.parentId)
    .filter(documentsTable.spaceId, filters.spaceId)
    .filter(documentsTable.isContainer, filters.isContainer)
    .search(documentsTable.name, filters.search)
    .lastNDays(documentViewsTable.lastViewedAt, filters.days)
    .order(orderByColumns[filters.orderBy ?? 'createdAt'], filters.order ?? 'desc')
    .limit(filters.limit)
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
    .groupBy(documentsTable.id)
    .$dynamic();

  const orderByColumn = orderByColumns[filters.orderBy ?? 'lastViewedAt'];

  const result = await new CollectionQuery(query)
    .filter(documentsTable.userId, userId)
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
  const [document] = await db
    .insert(documentsTable)
    .values({
      ...payload,
      handle,
      userId,
    })
    .returning();

  const result = { ...document, isFavorite: false, lastViewedAt: null, currentRevision: null };

  if (payload.documentType === 'space') {
    emitToUser(userId, 'space:created', result);
  } else if (payload.spaceId) {
    emitToSpace(payload.spaceId, 'document:created', result);
  }

  return result;
};

export const createDocumentWithRevision = async (
  payload: CreateDocumentWithRevisionInput,
  userId: string,
) => {
  const result = await db.transaction(async (tx) => {
    let handle = slugify(payload.name);
    if (await checkExistingDocumentHandle(handle)) {
      handle = appendUniqueSuffix(handle);
    }
    const [document] = await tx
      .insert(documentsTable)
      .values({
        ...payload,
        handle,
        userId,
      })
      .returning();

    const [revision] = await tx
      .insert(revisionsTable)
      .values({
        documentId: document.id,
        text: payload.revision.text,
        checksum: payload.revision.checksum,
        revisionName: payload.revision.revisionName,
        userId,
      })
      .returning();

    await saveRevisionContent(payload.revision.content, revision.id);

    await tx
      .update(documentsTable)
      .set({
        currentRevisionId: revision.id,
      })
      .where(eq(documentsTable.id, document.id));

    return {
      ...document,
      currentRevisionId: revision.id,
      currentRevision: revision,
      isFavorite: false,
      lastViewedAt: null,
    };
  });

  if (payload.documentType === 'space') {
    emitToUser(userId, 'space:created', result);
  } else if (payload.spaceId) {
    emitToSpace(payload.spaceId, 'document:created', result);
  }

  return result;
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

    const children = await db.query.documentsTable.findMany({
      where: eq(documentsTable.parentId, documentId),
    });

    for (const child of children) {
      dbWritesQueue.add(() => updateDocument(child.id, { spaceId }));
    }
  }

  const [document] = await db
    .update(documentsTable)
    .set({ ...payload, handle })
    .where(eq(documentsTable.id, documentId))
    .returning();

  if (document.documentType === 'space') {
    emitToUser(document.userId, 'space:updated', document);
  } else if (document.spaceId) {
    emitToSpace(document.spaceId, 'document:updated', document);
  }

  return document;
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
  const [document] = await db
    .delete(documentsTable)
    .where(eq(documentsTable.id, documentId))
    .returning();

  if (!document) return;

  if (document.documentType === 'space') {
    emitToUser(document.userId, 'space:deleted', document);
  } else if (document.spaceId) {
    emitToSpace(document.spaceId, 'document:deleted', document);
  }
  return document;
};
