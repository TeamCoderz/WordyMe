import { Favorite } from "@repo/backend/favorites.js";
import { post, del } from "./client.js";

export const addDocumentToFavorites = async (documentId: string) => {
  return await post<Favorite>(`/favorites/${documentId}`);
};

export const removeDocumentFromFavorites = async (documentId: string) => {
  return await del(`/favorites/${documentId}`);
};
