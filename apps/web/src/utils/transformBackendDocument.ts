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
    head: backendDoc.head,
    createdAt: backendDoc.createdAt,
    updatedAt: backendDoc.updatedAt,
    spaceId: backendDoc.spaceId,
    type: backendDoc.type,
    handle: backendDoc.handle,
    parentId: backendDoc.parentId,
    position: backendDoc.position,
    icon: backendDoc.icon,
    // Normalize is_container -> isContainer if present in backend views
    ...(typeof backendDoc.isContainer !== 'undefined'
      ? { isContainer: backendDoc.isContainer }
      : {}),
    documentViews: backendDoc.lastViewedAt ? [{ lastViewedAt: backendDoc.lastViewedAt }] : [],
    author: {
      id: backendDoc.authorId,
      name: backendDoc.authorName,
      image: backendDoc.authorImage,
    },
  };
}
