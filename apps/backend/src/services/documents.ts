/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import crypto from 'node:crypto';
import { and, count, countDistinct, eq, getTableColumns, gt, inArray, max, sql } from 'drizzle-orm';
import { SQLiteColumn } from 'drizzle-orm/sqlite-core';
import { HttpConflict, HttpUnprocessableEntity } from '@httpx/exception';
import { db, withWriteRetry } from '../lib/db.js';
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
import { emitToSpace, emitToUser } from '../lib/socket.js';
import { revisionsTable } from '../models/revisions.js';
import { deleteRevisionContent, saveRevisionContent } from './revision-contents.js';
import { deleteDocumentAttachments } from './attachments.js';

export const orderByColumns = {
  name: documentsTable.name,
  createdAt: documentsTable.createdAt,
  lastViewedAt: documentViewsTable.lastViewedAt,
} satisfies Record<string, SQLiteColumn>;

export const checkExistingDocumentHandle = async (
  handle: string,
  executor: Pick<typeof db, 'select'> = db,
) => {
  const result = await executor
    .select({ id: documentsTable.id })
    .from(documentsTable)
    .where(eq(documentsTable.handle, handle))
    .limit(1);
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
  const revisionId = crypto.randomUUID();
  await saveRevisionContent(payload.revision.content, revisionId);

  let result;

  try {
    result = await withWriteRetry(() =>
      db.transaction(async (tx) => {
        let handle = slugify(payload.name);
        if (await checkExistingDocumentHandle(handle, tx)) {
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
            id: revisionId,
            documentId: document.id,
            text: payload.revision.text,
            checksum: payload.revision.checksum,
            revisionName: payload.revision.revisionName,
            userId,
          })
          .returning();

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
      }),
    );
  } catch (error) {
    await deleteRevisionContent(revisionId);
    throw error;
  }

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

const emitDocumentUpdate = (document: typeof documentsTable.$inferSelect) => {
  if (document.documentType === 'space') {
    emitToUser(document.userId, 'space:updated', document);
  } else if (document.spaceId) {
    emitToSpace(document.spaceId, 'document:updated', document);
  } else {
    emitToUser(document.userId, 'document:updated', document);
  }
};

type SqlExecutor = Pick<typeof db, 'all'>;

const descendantIds = async (documentId: string, executor: SqlExecutor = db): Promise<string[]> => {
  const rows = await executor.all<{ id: string }>(sql`
    with recursive subtree(id) as (
      select id from documents where parent_id = ${documentId}
      union
      select d.id from documents d join subtree s on d.parent_id = s.id
    )
    select id from subtree where id <> ${documentId}
  `);

  return rows.map((row) => row.id);
};

export const assertNoParentCycle = async (
  documentId: string,
  parentId: string,
  executor: SqlExecutor = db,
) => {
  if (parentId === documentId) {
    throw new HttpUnprocessableEntity({
      message: 'A document cannot be its own parent.',
    });
  }

  const descendants = await descendantIds(documentId, executor);

  if (descendants.includes(parentId)) {
    throw new HttpUnprocessableEntity({
      message: 'A document cannot be moved inside one of its own descendants.',
    });
  }
};

export const updateDocument = async (documentId: string, payload: UpdateDocumentInput) => {
  let handle: string | undefined;

  if (payload.name) {
    handle = slugify(payload.name);
    if (await checkExistingDocumentHandle(handle)) {
      handle = appendUniqueSuffix(handle);
    }
  }

  const { expectedCurrentRevisionId, ...updates } = payload;

  const { document, moved } = await withWriteRetry(() =>
    db.transaction(async (tx) => {
      if (payload.parentId) {
        await assertNoParentCycle(documentId, payload.parentId, tx);
      }

      if (expectedCurrentRevisionId !== undefined) {
        const [current] = await tx
          .select({ currentRevisionId: documentsTable.currentRevisionId })
          .from(documentsTable)
          .where(eq(documentsTable.id, documentId))
          .limit(1);

        if (current && current.currentRevisionId !== expectedCurrentRevisionId) {
          throw new HttpConflict(
            'This document was changed somewhere else since you opened it. Reload to get the latest version; your work was kept as a separate revision.',
          );
        }
      }

      const [document] = await tx
        .update(documentsTable)
        .set({ ...updates, handle })
        .where(eq(documentsTable.id, documentId))
        .returning();

      if (!payload.spaceId) {
        return { document, moved: [] as (typeof documentsTable.$inferSelect)[] };
      }

      const ids = await descendantIds(documentId, tx);

      if (ids.length === 0) {
        return { document, moved: [] as (typeof documentsTable.$inferSelect)[] };
      }

      const moved = await tx
        .update(documentsTable)
        .set({ spaceId: payload.spaceId })
        .where(inArray(documentsTable.id, ids))
        .returning();

      return { document, moved };
    }),
  );

  emitDocumentUpdate(document);
  moved.forEach(emitDocumentUpdate);

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
  const { document, documentIds, revisionIds } = await withWriteRetry(() =>
    db.transaction(async (tx) => {
      const subtree = await tx.all<{ id: string }>(sql`
        with recursive subtree(id) as (
          select id from documents where id = ${documentId}
          union
          select d.id from documents d
            join subtree s on d.parent_id = s.id or d.space_id = s.id
        )
        select id from subtree
      `);
      const documentIds = subtree.map((row) => row.id);

      const revisionIds =
        documentIds.length > 0
          ? (
              await tx
                .select({ id: revisionsTable.id })
                .from(revisionsTable)
                .where(inArray(revisionsTable.documentId, documentIds))
            ).map((row) => row.id)
          : [];

      const [document] = await tx
        .delete(documentsTable)
        .where(eq(documentsTable.id, documentId))
        .returning();

      return { document, documentIds, revisionIds };
    }),
  );

  if (!document) return;

  await Promise.all([
    ...revisionIds.map(deleteRevisionContent),
    ...documentIds.map(deleteDocumentAttachments),
  ]);

  if (document.documentType === 'space') {
    emitToUser(document.userId, 'space:deleted', document);
  } else if (document.spaceId) {
    emitToSpace(document.spaceId, 'document:deleted', document);
  }
  return document;
};
