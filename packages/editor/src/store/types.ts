/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Document, Revision, EditorRevision, Space } from '@repo/types';
export type Services = {
  uploadImage: (file: File) => Promise<{
    error: unknown;
    data: {
      id: string;
      path: string;
      fullPath: string;
    } | null;
  }>;
  uploadAttachment: (file: File) => Promise<{
    error: unknown;
    data: {
      id: string;
      path: string;
      fullPath: string;
    } | null;
  }>;
  getImageSignedUrl: (path: string) => Promise<{
    error: unknown;
    data: {
      signedUrl: string;
    } | null;
  }>;
  getAttachmentSignedUrl: (path: string) => Promise<{
    error: unknown;
    data: {
      signedUrl: string;
    } | null;
  }>;
  navigate: (path: string) => void;
  getSpaces: () => Promise<Space[]>;
  getDocumentsBySpaceId: (spaceId: string) => Promise<Document[]>;
  getDocumentById: (documentId: string) => Promise<Document | null>;
  getDocumentByHandle: (handle: string) => Promise<Document | null>;
  getLocalRevisionByDocumentId: (
    documentId: string,
    head: string,
  ) => Promise<EditorRevision | null>;
  getRevisionsByDocumentId: (documentId: string) => Promise<Revision[]>;
  getRevisionById: (revisionId: string) => Promise<EditorRevision | null>;
};
