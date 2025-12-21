import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "../lib/db.js";
import { CopyDocumentInput } from "../schemas/operations.js";
import { documentsTable } from "../models/documents.js";
import { createDocument } from "./documents.js";
import { createRevision, getRevisionById } from "./revisions.js";
import { copyDocumentAttachments } from "./attachments.js";
import { RevisionDetails } from "../schemas/revisions.js";

export const copyDocument = async (
  documentId: string,
  payload: CopyDocumentInput,
  userId: string,
) => {
  const originalDocument = await db.query.documentsTable.findFirst({
    where: eq(documentsTable.id, documentId),
  });
  if (!originalDocument) {
    return false;
  }
  const newDocument = await createDocument(
    {
      name: payload.name,
      icon: originalDocument.icon,
      position: payload.position ?? originalDocument.position,
      parentId: payload.parentId,
      spaceId: payload.spaceId,
      documentType: originalDocument.documentType,
      isContainer: originalDocument.isContainer,
    },
    userId,
  );

  let newRevision: RevisionDetails | null = null;
  if (originalDocument.currentRevisionId) {
    const originalRevision = await getRevisionById(
      originalDocument.currentRevisionId,
    );
    if (originalRevision) {
      newRevision = await createRevision(
        {
          documentId: newDocument.id,
          revisionName: originalRevision.revisionName,
          text: originalRevision.text,
          checksum: originalRevision.checksum,
          content: originalRevision.content,
          makeCurrentRevision: true,
        },
        userId,
      );
    }
  }

  await copyDocumentAttachments(documentId, newDocument.id);

  const children = await db.query.documentsTable.findMany({
    where: or(
      eq(documentsTable.parentId, documentId),
      and(
        eq(documentsTable.spaceId, documentId),
        isNull(documentsTable.parentId),
      ),
    ),
  });

  await Promise.all(
    children.map((child) =>
      copyDocument(
        child.id,
        {
          name: child.name,
          position: child.position,
          parentId: child.parentId === documentId ? newDocument.id : null,
          spaceId:
            child.spaceId === documentId ? newDocument.id : newDocument.spaceId,
        },
        userId,
      ),
    ),
  );

  return { ...newDocument, currentRevision: newRevision };
};
