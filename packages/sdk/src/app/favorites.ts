import { Favorite } from "@repo/backend/favorites.js";
import { PaginatedResult, DocumentFilters } from "@repo/backend/pagination.js";
import { post, del, get } from "./client.js";
import { PlainDocument } from "@repo/backend/documents.js";

export const getFavorites = async (filters?: DocumentFilters) => {
  return await get<PaginatedResult<PlainDocument>>("/favorites", filters);
};

export const addDocumentToFavorites = async (documentId: string) => {
  return await post<Favorite>(`/favorites/${documentId}`);
};

export const removeDocumentFromFavorites = async (documentId: string) => {
  return await del(`/favorites/${documentId}`);
};
