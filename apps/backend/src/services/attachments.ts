export const getAttachmentUrl = (documentId: string, filename: string) => {
  return `/storage/attachments/${documentId}/${filename}`;
};
