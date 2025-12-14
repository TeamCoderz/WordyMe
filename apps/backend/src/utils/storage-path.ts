export const createRevisionContentPath = (
  userId: string,
  documentId: string
) => {
  return `${userId}/${documentId}/${Date.now()}.json`;
};
