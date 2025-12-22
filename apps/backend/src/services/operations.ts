import { and, eq, isNull, or } from 'drizzle-orm';
import { db } from '../lib/db.js';
import { CopyDocumentInput, ExportedDocument, ImportInheritedData } from '../schemas/operations.js';
import { documentsTable } from '../models/documents.js';
import { createDocument } from './documents.js';
import { createRevision, getRevisionById } from './revisions.js';
import {
  copyDocumentAttachments,
  exportDocumentAttachments,
  importDocumentAttachment,
} from './attachments.js';
import { RevisionDetails } from '../schemas/revisions.js';
import { dbWritesQueue } from '../queues/db-writes.js';
import { readRevisionContent } from './revision-contents.js';

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
    const originalRevision = await getRevisionById(originalDocument.currentRevisionId);
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
      and(eq(documentsTable.spaceId, documentId), isNull(documentsTable.parentId)),
    ),
  });

  children.map((child) =>
    dbWritesQueue.add(() =>
      copyDocument(
        child.id,
        {
          name: child.name,
          position: child.position,
          parentId: child.parentId === documentId ? newDocument.id : null,
          spaceId: child.spaceId === documentId ? newDocument.id : newDocument.spaceId,
        },
        userId,
      ),
    ),
  );

  return { ...newDocument, currentRevision: newRevision };
};

export const exportDocumentTree = async (
  documentId: string,
  visitedDocuments: Set<string> = new Set(),
  currentDepth: number = 0,
): Promise<ExportedDocument> => {
  if (visitedDocuments.has(documentId)) {
    throw new Error(`Circular reference detected: document ${documentId} was already processed`);
  }

  if (currentDepth >= 100) {
    throw new Error(`Maximum depth reached: ${currentDepth} levels of nested documents`);
  }

  visitedDocuments.add(documentId);

  const document = await db.query.documentsTable.findFirst({
    where: eq(documentsTable.id, documentId),
    with: {
      currentRevision: true,
    },
  });

  if (!document) {
    throw new Error(`Document ${documentId} not found`);
  }

  const currentRevision = document.currentRevision;

  const exportedDocument: ExportedDocument = {
    name: document.name,
    handle: document.handle,
    icon: document.icon,
    type: document.documentType,
    position: document.position,
    is_container: document.isContainer,
    revision: currentRevision
      ? {
          text: currentRevision.text,
          checksum: currentRevision.checksum,
          content: await readRevisionContent(currentRevision.id),
        }
      : null,
    attachments: await exportDocumentAttachments(documentId),
    children: [],
    spaceRootChildren: [],
  };

  const children = await db.query.documentsTable.findMany({
    where: or(
      eq(documentsTable.parentId, documentId),
      and(eq(documentsTable.spaceId, documentId), isNull(documentsTable.parentId)),
    ),
  });

  for (const child of children) {
    const childResult = await exportDocumentTree(child.id, visitedDocuments, currentDepth + 1);
    if (child.parentId === documentId) {
      exportedDocument.children.push(childResult);
    } else {
      exportedDocument.spaceRootChildren.push(childResult);
    }
  }

  return exportedDocument;
};

export const importDocumentTree = async (
  document: ExportedDocument,
  inherited: ImportInheritedData,
  userId: string,
  currentDepth: number = 0,
): Promise<{ id: string; name: string }> => {
  if (currentDepth >= 100) {
    throw new Error(`Maximum depth reached: ${currentDepth} levels of nested documents`);
  }

  const newDocument = await createDocument(
    {
      name: document.name,
      icon: document.icon,
      documentType: document.type as 'space' | 'folder' | 'note',
      isContainer: document.is_container,
      position: inherited.position ?? document.position,
      spaceId: inherited.spaceId,
      parentId: inherited.parentId,
    },
    userId,
  );

  if (document.revision) {
    await createRevision(
      {
        documentId: newDocument.id,
        text: document.revision.text,
        checksum: document.revision.checksum,
        content: document.revision.content,
        makeCurrentRevision: true,
      },
      userId,
    );
  }

  await Promise.all(
    document.attachments.map((attachment) => importDocumentAttachment(attachment, newDocument.id)),
  );

  for (const child of document.children) {
    dbWritesQueue.add(() =>
      importDocumentTree(
        child,
        {
          spaceId: inherited.spaceId,
          parentId: newDocument.id,
          position: child.position,
        },
        userId,
        currentDepth + 1,
      ),
    );
  }

  for (const spaceChild of document.spaceRootChildren) {
    dbWritesQueue.add(() =>
      importDocumentTree(
        spaceChild,
        {
          spaceId: newDocument.id,
          parentId: null,
          position: spaceChild.position,
        },
        userId,
        currentDepth + 1,
      ),
    );
  }

  return newDocument;
};
