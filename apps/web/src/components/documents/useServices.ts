import { uploadAttachment } from '@repo/sdk/storage.ts';
import type { Services } from '@repo/editor/store';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getAllSpacesQueryOptions } from '@/queries/spaces';
import {
  getAllDocumentsQueryOptions,
  getDocumentByHandleQueryOptions,
  getDocumentByIdQueryOptions,
} from '@/queries/documents';
import {
  getLocalRevisionByDocumentIdQueryOptions,
  getRevisionByIdQueryOptions,
  getRevisionsByDocumentIdQueryOptions,
} from '@/queries/revisions';

function getAttachmentURL(documentId: string, fileName: string) {
  return `${import.meta.env.VITE_BACKEND_URL ?? ''}/storage/attachments/${documentId}/${fileName}`;
}

export const useServices = (documentId?: string, userId?: string): Services => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return useMemo(
    () => ({
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
      navigate: (path: string) => navigate({ to: path }),
      getSpaces: () => queryClient.ensureQueryData(getAllSpacesQueryOptions),
      getDocumentsBySpaceId: (spaceId: string) =>
        queryClient.ensureQueryData(getAllDocumentsQueryOptions(spaceId)),
      getDocumentById: (documentId: string) =>
        queryClient.ensureQueryData(getDocumentByIdQueryOptions(documentId)),
      getDocumentByHandle: (handle: string) =>
        queryClient.ensureQueryData(getDocumentByHandleQueryOptions(handle)),
      getLocalRevisionByDocumentId: (documentId: string, head: string) =>
        queryClient.ensureQueryData(getLocalRevisionByDocumentIdQueryOptions(documentId, head)),
      getRevisionsByDocumentId: (documentId: string) =>
        queryClient.ensureQueryData(getRevisionsByDocumentIdQueryOptions(documentId)),
      getRevisionById: (revisionId: string) =>
        queryClient.ensureQueryData(getRevisionByIdQueryOptions(revisionId, true)),
    }),
    [documentId, userId, navigate, queryClient],
  );
};
