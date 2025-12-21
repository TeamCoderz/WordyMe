import { Favorite } from "@repo/backend/favorites.js";
import {
  PaginatedResult,
  DocumentFiltersInput,
} from "@repo/backend/pagination.js";
import { post, del, get } from "./client.js";
import { DocumentListItem } from "@repo/backend/documents.js";

export const getFavorites = async (filters?: DocumentFiltersInput) => {
  return await get<PaginatedResult<DocumentListItem>>("/favorites", filters);
};

export const addDocumentToFavorites = async (documentId: string) => {
  return await post<Favorite>(`/favorites/${documentId}`);
};

export const removeDocumentFromFavorites = async (documentId: string) => {
  return await del(`/favorites/${documentId}`);
};
