import type {
  CopyDocumentInput,
  ExportedDocument,
  ImportDocumentInput,
} from '@repo/backend/operations.js';
import type { PlainDocument } from '@repo/backend/documents.js';
import { patch, post, sendFormData } from './client.js';

export const copyDocument = async (documentId: string, payload: CopyDocumentInput) => {
  return await post<PlainDocument>(`/documents/${documentId}/copy`, payload);
};

export const moveDocument = async (
  documentId: string,
  payload: Omit<CopyDocumentInput, 'name'>,
) => {
  return await patch<PlainDocument>(`/documents/${documentId}`, payload);
};

export const exportDocument = async (documentId: string) => {
  return await post<ExportedDocument>(`/documents/${documentId}/export`);
};

export const importDocument = async (document: File, payload: ImportDocumentInput) => {
  const formData = new FormData();
  formData.append('document', document);
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value.toString());
    }
  });
  return await sendFormData<PlainDocument>('/documents/import', formData);
};
