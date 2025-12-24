import {
  getAttachmentSignedUrl,
  uploadAttachment,
} from '@repo/backend/sdk/storage/attatchements.js';
import {
  getDocumentImageSignedUrl,
  uploadDocumentImage,
} from '@repo/backend/sdk/storage/document-images.js';
import type { Services } from '@repo/editor/store';

export const getServices = (documentId?: string, userId?: string): Services => {
  return {
    uploadImage: (file: File) => uploadDocumentImage(file, documentId ?? '', userId ?? ''),
    getImageSignedUrl: (fileName: string) =>
      getDocumentImageSignedUrl(`/${userId}/${documentId}/${fileName}`),
    uploadAttachment: (file: File) => uploadAttachment(file, documentId ?? '', userId ?? ''),
    getAttachmentSignedUrl: (fileName: string) =>
      getAttachmentSignedUrl(`${userId}/${documentId}/${fileName}`),
  };
};
