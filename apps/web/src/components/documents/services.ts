import { uploadAttachment } from '@repo/sdk/storage.ts';
// import {
//   getDocumentImageSignedUrl,
//   uploadDocumentImage,
// } from '@repo/backend/sdk/storage/document-images.js';
import type { Services } from '@repo/editor/store';
function getAttachmentURL(documentId: string, fileName: string) {
  return `${import.meta.env.VITE_BACKEND_URL ?? ''}/storage/attachments/${documentId}/${fileName}`;
}
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
            fullPath: `${import.meta.env.VITE_BACKEND_URL ?? ''}/${d.data.url}`,
          },
        };
      }),
    getImageSignedUrl: async (fileName: string) => ({
      error: null,
      data: {
        signedUrl: getAttachmentURL(documentId ?? '', fileName),
      },
    }),
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
            fullPath: `${import.meta.env.VITE_BACKEND_URL ?? ''}/${d.data.url}`,
          },
        };
      }),
    getAttachmentSignedUrl: async (fileName: string) => ({
      error: null,
      data: {
        signedUrl: getAttachmentURL(documentId ?? '', fileName),
      },
    }),
  };
};
