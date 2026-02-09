import { Document } from '@repo/types';

/**
 * Transform backend document response to match frontend Document type
 * Backend returns separate fields (authorId, authorName, authorImage, lastViewedAt)
 * Frontend expects nested objects (author: { id, name, image }, documentViews: [{ lastViewedAt }])
 */
export function transformBackendDocument(backendDoc: any): Document {
  return {
    id: backendDoc.id,
    name: backendDoc.name,
    currentRevisionId: backendDoc.currentRevisionId,
    createdAt: backendDoc.createdAt,
    updatedAt: backendDoc.updatedAt,
    spaceId: backendDoc.spaceId,
    documentType: backendDoc.documentType,
    handle: backendDoc.handle,
    parentId: backendDoc.parentId,
    position: backendDoc.position,
    icon: backendDoc.icon,
    isContainer: Boolean(backendDoc.isContainer),
    lastViewedAt: backendDoc.lastViewedAt ?? null,
    isFavorite: false,
    clientId: null,
    userId: backendDoc.userId,
  };
}
