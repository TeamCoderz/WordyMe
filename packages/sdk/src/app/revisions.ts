import {
  CreateRevisionInput,
  PlainRevision,
  RevisionDetails,
  UpdateRevisionNameInput,
  UpdateRevisionContentInput,
} from '@repo/backend/revisions.js';
import { get, post, patch, del } from './client.js';

export const getCurrentRevisionByDocumentId = async (documentId: string) => {
  return await get<RevisionDetails>(`/documents/${documentId}/revisions/current`);
};

export const getRevisionsByDocumentId = async (documentId: string) => {
  return await get<PlainRevision[]>(`/documents/${documentId}/revisions`);
};

export const createRevision = async (data: CreateRevisionInput) => {
  return await post<RevisionDetails>('/revisions', data);
};

export const getRevisionById = async (revisionId: string) => {
  return await get<RevisionDetails>(`/revisions/${revisionId}`);
};

export const updateRevisionName = async (revisionId: string, data: UpdateRevisionNameInput) => {
  return await patch<PlainRevision>(`/revisions/${revisionId}`, data);
};

export const updateRevisionContent = async (
  revisionId: string,
  data: UpdateRevisionContentInput,
) => {
  return await patch<PlainRevision>(`/revisions/${revisionId}`, data);
};

export const deleteRevision = async (revisionId: string) => {
  return await del(`/revisions/${revisionId}`);
};
