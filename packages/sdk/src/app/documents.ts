import {
  CreateDocumentInput,
  DocumentDetails,
  DocumentFilters,
  DocumentListItem,
  PlainDocument,
  UpdateDocumentInput,
} from "@repo/backend/documents.js";
import { PlainRevision, RevisionDetails } from "@repo/backend/revisions.js";
import { PaginatedResult } from "@repo/backend/pagination.js";
import { del, get, patch, post } from "./client.js";

export const createDocument = async (data: CreateDocumentInput) => {
  return await post<PlainDocument>("/documents", data);
};

export const getUserDocuments = async () => {
  return await get<DocumentListItem[]>("/documents");
};

export const getLastViewedDocuments = async (filters?: DocumentFilters) => {
  return await get<PaginatedResult<DocumentListItem>>(
    "/documents/last-viewed",
    filters,
  );
};

export const getDocumentById = async (documentId: string) => {
  return await get<DocumentDetails>(`/documents/${documentId}`);
};

export const getDocumentByHandle = async (handle: string) => {
  return await get<DocumentDetails>(`/documents/handle/${handle}`);
};

export const updateDocument = async (
  documentId: string,
  data: UpdateDocumentInput,
) => {
  return await patch<PlainDocument>(`/documents/${documentId}`, data);
};

export const deleteDocument = async (documentId: string) => {
  return await del(`/documents/${documentId}`);
};

export const getCurrentRevisionByDocumentId = async (documentId: string) => {
  return await get<RevisionDetails>(
    `/documents/${documentId}/revisions/current`,
  );
};

export const getRevisionsByDocumentId = async (documentId: string) => {
  return await get<PlainRevision[]>(`/documents/${documentId}/revisions`);
};
