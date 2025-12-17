import { eq, and } from "drizzle-orm";
import { db } from "../lib/db.js";
import { favoritesTable } from "../models/favorites.js";

export const addDocumentToFavorites = async (
  userId: string,
  documentId: string,
) => {
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

export const removeDocumentFromFavorites = async (
  userId: string,
  documentId: string,
) => {
  const result = await db
    .delete(favoritesTable)
    .where(
      and(
        eq(favoritesTable.userId, userId),
        eq(favoritesTable.documentId, documentId),
      ),
    );

  return result;
};

/**
 TODO: We need to add pagination and sorting to this function and
 Wil we make full_document VIEW ?!
 */
export const listFavorites = async (userId: string) => {};
