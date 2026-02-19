/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { Document, DocumentStorageUsage, EditorDocument } from './documents';
import type { Revision, EditorRevision } from './revisions';
import type { User } from './user';
import type { Space } from './spaces';
import type { InstanceSettings } from './instance';

export type APIError = { title: string; subtitle?: string };
export type APIResponse<T> = { data: T; error?: never } | { data?: never; error: APIError };
export type GetUsersResponse = APIResponse<User[]>;

export type GetUserResponse = APIResponse<User | null>;

export type UserUpdateInput = Partial<User>;
export type PatchUserResponse = APIResponse<User>;

export type DeleteUserResponse = APIResponse<string>;

export type GetDocumentsResponse = APIResponse<Document[]>;

export type PostDocumentsResponse = APIResponse<Document>;

export type GetDocumentStorageUsageResponse = APIResponse<DocumentStorageUsage[]>;

export type GetPublishedDocumentsResponse = APIResponse<Document[]>;

export type GetDocumentResponse = APIResponse<Document>;

export type GetEditorDocumentResponse = APIResponse<EditorDocument>;

export type GetDocumentThumbnailResponse = APIResponse<string>;

export type PatchDocumentResponse = APIResponse<{
  document: Document;
  revision: Revision | null;
}>;

export type DeleteDocumentResponse = APIResponse<string>;

export type ForkDocumentResponse = APIResponse<Document & { data: Uint8Array }>;

export type CheckHandleResponse = APIResponse<boolean>;

export type GetRevisionsResponse = APIResponse<Revision[]>;

export type GetRevisionResponse = APIResponse<EditorRevision>;

export type PostRevisionResponse = APIResponse<Revision>;

export type DeleteRevisionResponse = APIResponse<{
  id: string;
}>;
export type PatchRevisionResponse = APIResponse<Revision>;

export type Pix2textResponse = APIResponse<{ generated_text: string }>;

export type GetSpacesResponse = APIResponse<Space[]>;

export type GetSpaceResponse = APIResponse<Space>;

export type CreateSpaceInput = Omit<Space, 'id' | 'createdAt' | 'updatedAt'> & {
  userId: string;
};

export type PostSpaceResponse = APIResponse<Space>;

export type PatchSpaceResponse = APIResponse<Space>;

export type DeleteSpaceResponse = APIResponse<string>;

export type GetInstanceSettingsResponse = APIResponse<InstanceSettings>;
