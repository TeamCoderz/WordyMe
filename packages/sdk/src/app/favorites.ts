import { Favorite } from "@repo/backend/favorites.js";
import { PaginatedResult, PaginationQuery } from "@repo/backend/pagination.js";
import { post, del, get } from "./client.js";
import { PlainDocument } from "@repo/backend/documents.js";

export const getFavorites = async (pagination?: PaginationQuery) => {
  return await get<PaginatedResult<PlainDocument>>("/favorites", pagination);
};

export const addDocumentToFavorites = async (documentId: string) => {
  return await post<Favorite>(`/favorites/${documentId}`);
};

export const removeDocumentFromFavorites = async (documentId: string) => {
  return await del(`/favorites/${documentId}`);
};
