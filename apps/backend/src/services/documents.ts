import { eq } from "drizzle-orm";
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

export const checkExistingDocumentHandle = async (handle: string) => {
  const result = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.handle, handle));
  return result.length > 0;
};

export const getDocumentDetails = async (
  { documentId, handle }: DocumentIdentifier,
  userId: string,
) => {
  const document = await db.query.documentsTable.findFirst({
    where: documentId
      ? eq(documentsTable.id, documentId)
      : eq(documentsTable.handle, handle!),
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

export const createDocument = async (
  payload: CreateDocumentInput,
  userId: string,
) => {
  let handle = slugify(payload.name);
  if (await checkExistingDocumentHandle(handle)) {
    handle = appendUniqueSuffix(handle);
  }
  return await db
    .insert(documentsTable)
    .values({
      ...payload,
      handle,
      userId,
    })
    .returning();
};

export const updateDocument = async (
  documentId: string,
  payload: UpdateDocumentInput,
) => {
  let handle;
  if (payload.name) {
    handle = slugify(payload.name);
    if (await checkExistingDocumentHandle(handle)) {
      handle = appendUniqueSuffix(handle);
    }
  }
  return await db
    .update(documentsTable)
    .set({ ...payload, handle })
    .where(eq(documentsTable.id, documentId))
    .returning();
};

export const deleteDocument = async (documentId: string) => {
  return await db
    .delete(documentsTable)
    .where(eq(documentsTable.id, documentId));
};
