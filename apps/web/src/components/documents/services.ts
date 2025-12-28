import { uploadAttachment, getAttachment } from '@repo/sdk/storage.ts';
// import {
//   getDocumentImageSignedUrl,
//   uploadDocumentImage,
// } from '@repo/backend/sdk/storage/document-images.js';
import type { Services } from '@repo/editor/store';

export const getServices = (documentId?: string): Services => {
  return {
    uploadImage: (file: File) =>
      uploadAttachment(documentId ?? '', file).then((d) => {
        if (d.error || !d.data?.url) {
          return {
            error: d.error ?? new Error('Failed to upload image'),
            data: null,
          };
        }
        return {
          error: null,
          data: {
            id: crypto.randomUUID(),
            path: d.data.url,
            fullPath: d.data.url,
          },
        };
      }),
    getImageSignedUrl: (fileName: string) => getAttachment(documentId ?? '', fileName),
    uploadAttachment: (file: File) =>
      uploadAttachment(documentId ?? '', file).then((d) => {
        if (d.error || !d.data?.url) {
          return {
            error: d.error ?? new Error('Failed to upload attachment'),
            data: null,
          };
        }
        return {
          error: null,
          data: {
            id: crypto.randomUUID(),
            path: d.data.url,
            fullPath: d.data.url,
          },
        };
      }),
    getAttachmentSignedUrl: (fileName: string) => getAttachment(documentId ?? '', fileName),
  };
};
