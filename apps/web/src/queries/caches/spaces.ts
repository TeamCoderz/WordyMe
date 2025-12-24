export const cachedSpacesIds = new Set<string>();

export function isSpaceCached(documentId: string | null) {
  if (documentId) {
    return cachedSpacesIds.has(documentId);
  }
  return false;
}
export const addSpaceToCache = (documentId: string | null) => {
  if (documentId) {
    cachedSpacesIds.add(documentId);
  }
};
export const removeSpaceFromCache = (documentId: string | null) => {
  if (documentId) {
    cachedSpacesIds.delete(documentId);
  }
};
