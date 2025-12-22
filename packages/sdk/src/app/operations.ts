import {
  CopyDocumentInput,
  ExportedDocument,
  ImportDocumentInput,
} from '@repo/backend/operations.js';
import { DocumentDetails, PlainDocument } from '@repo/backend/documents.js';
import { post } from './client.js';

export const copyDocument = async (documentId: string, payload: CopyDocumentInput) => {
  return await post<DocumentDetails>(`/documents/${documentId}/copy`, payload);
};

export const exportDocument = async (documentId: string) => {
  return await post<ExportedDocument>(`/documents/${documentId}/export`);
};

export const importDocument = async (payload: ImportDocumentInput) => {
  return await post<PlainDocument>('/documents/import', payload);
};
