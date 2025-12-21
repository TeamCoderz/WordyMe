import { cp } from "node:fs/promises";
import { resolvePhysicalPath } from "../lib/storage.js";

export const getAttachmentUrl = (documentId: string, filename: string) => {
  return `/storage/attachments/${documentId}/${filename}`;
};

export const copyDocumentAttachments = async (
  sourceDocumentId: string,
  targetDocumentId: string,
) => {
  const sourceDirectory = resolvePhysicalPath(
    `attachments/${sourceDocumentId}`,
  );
  const targetDirectory = resolvePhysicalPath(
    `attachments/${targetDocumentId}`,
  );

  return await cp(sourceDirectory, targetDirectory, {
    recursive: true,
    errorOnExist: false,
  });
};
