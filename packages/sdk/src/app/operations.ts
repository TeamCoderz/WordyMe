import { CopyDocumentInput } from '@repo/backend/operations.js';
import { DocumentDetails } from '@repo/backend/documents.js';
import { post } from './client.js';

export const copyDocument = async (documentId: string, payload: CopyDocumentInput) => {
  return await post<DocumentDetails>(`/documents/${documentId}/copy`, payload);
};
