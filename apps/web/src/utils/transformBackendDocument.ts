import { getDocumentByHandle } from '@repo/sdk/documents.js';
import { Document } from '@repo/types';

/**
 * Transform backend document response to match frontend Document type
 * Backend returns separate fields (authorId, authorName, authorImage, lastViewedAt)
 * Frontend expects nested objects (author: { id, name, image }, documentViews: [{ lastViewedAt }])
 */
export function transformBackendDocument(
  backendDoc: NonNullable<Awaited<ReturnType<typeof getDocumentByHandle>>['data']>,
): Document {
  return {
    id: backendDoc.id,
    name: backendDoc.name,
    head: backendDoc.currentRevisionId,
    createdAt: new Date(backendDoc.createdAt).toISOString(),
    updatedAt: new Date(backendDoc.updatedAt).toISOString(),
    spaceId: backendDoc.spaceId,
    type: backendDoc.documentType,
    handle: backendDoc.handle,
    parentId: backendDoc.parentId,
    position: backendDoc.position,
    icon: backendDoc.icon,
    // Normalize is_container -> isContainer if present in backend views
    ...(typeof backendDoc.isContainer !== 'undefined'
      ? { isContainer: backendDoc.isContainer }
      : {}),
    documentViews: backendDoc.lastViewedAt
      ? [{ lastViewedAt: new Date(backendDoc.lastViewedAt).toISOString() }]
      : [],
    author: {
      id: backendDoc.userId,
      name: backendDoc.userId,
      image: backendDoc.userId,
    },
  };
}
