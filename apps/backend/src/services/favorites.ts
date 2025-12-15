import { eq, and, isNull } from "drizzle-orm";
import { db } from "../lib/db.js";
import { favoritesTable } from "../models/favorites.js";
import { DocumentIdParamInput } from "../schemas/favorites.js";

export const addDocumentToFavorites = async (
  userId: string,
  payload: DocumentIdParamInput,
) => {
  const [favorite] = await db
    .insert(favoritesTable)
    .values({ userId, documentId: payload.documentId })
    .onConflictDoUpdate({
      target: [favoritesTable.userId, favoritesTable.documentId],
      set: { updatedAt: new Date(), deletedAt: null },
    })
    .returning({
      id: favoritesTable.id,
      documentId: favoritesTable.documentId,
      userId: favoritesTable.userId,
    });

  return favorite ?? null;
};

export const removeDocumentFromFavorites = async (
  userId: string,
  payload: DocumentIdParamInput,
) => {
  const [deleted] = await db
    .update(favoritesTable)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(favoritesTable.userId, userId),
        eq(favoritesTable.documentId, payload.documentId),
        isNull(favoritesTable.deletedAt),
      ),
    )
    .returning({
      id: favoritesTable.id,
      documentId: favoritesTable.documentId,
      userId: favoritesTable.userId,
    });

  return deleted ?? null;
};

/**
 TODO: We need to add pagination and sorting to this function and
 Wil we make full_document VIEW ?!
 */
export const listFavorites = async (userId: string) => {};
