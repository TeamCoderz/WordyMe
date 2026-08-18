/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { and, eq, isNull, or } from 'drizzle-orm';
import { db } from '../lib/db.js';
import { CopyDocumentInput, ImportDocumentInput, MAX_IMPORT_DEPTH } from '../schemas/operations.js';
import { documentsTable } from '../models/documents.js';
import { createDocument, createDocumentWithRevision } from './documents.js';
import { getRevisionById } from './revisions.js';
import { readFile, stat } from 'node:fs/promises';
import {
  bufferToDataURL,
  copyDocumentAttachments,
  importDocumentAttachment,
  listDocumentAttachmentFiles,
} from './attachments.js';
import { getRevisionContentPhysicalPath, readRevisionContent } from './revision-contents.js';

export const copyDocument = async (
  documentId: string,
  payload: CopyDocumentInput,
  userId: string,
  visitedDocuments: Set<string> = new Set(),
  currentDepth: number = 0,
) => {
  if (visitedDocuments.has(documentId) || currentDepth >= MAX_IMPORT_DEPTH) {
    return false;
  }

  visitedDocuments.add(documentId);

  const originalDocument = await db.query.documentsTable.findFirst({
    where: eq(documentsTable.id, documentId),
  });

  if (!originalDocument) {
    return false;
  }

  const documentBody = {
    name: payload.name,
    icon: originalDocument.icon,
    position: payload.position ?? originalDocument.position,
    parentId: payload.parentId,
    spaceId: payload.spaceId,
    documentType: originalDocument.documentType,
    isContainer: originalDocument.isContainer,
    clientId: null,
  };

  const originalRevision =
    originalDocument.currentRevisionId &&
    (await getRevisionById(originalDocument.currentRevisionId));

  const newDocument = originalRevision
    ? await createDocumentWithRevision({ ...documentBody, revision: originalRevision }, userId)
    : await createDocument(documentBody, userId);

  await copyDocumentAttachments(documentId, newDocument.id);

  const children = await db.query.documentsTable.findMany({
    where: or(
      eq(documentsTable.parentId, documentId),
      and(eq(documentsTable.spaceId, documentId), isNull(documentsTable.parentId)),
    ),
  });

  for (const child of children) {
    await copyDocument(
      child.id,
      {
        name: child.name,
        position: child.position,
        parentId: child.parentId === documentId ? newDocument.id : null,
        spaceId: child.spaceId === documentId ? newDocument.id : newDocument.spaceId,
      },
      userId,
      visitedDocuments,
      currentDepth + 1,
    );
  }

  return newDocument;
};

export const MAX_EXPORT_BYTES = 50 * 1024 * 1024;

const BASE64_OVERHEAD = 4 / 3;

const childDocumentsOf = async (documentId: string) =>
  db.query.documentsTable.findMany({
    where: or(
      eq(documentsTable.parentId, documentId),
      and(eq(documentsTable.spaceId, documentId), isNull(documentsTable.parentId)),
    ),
  });

export const estimateExportBytes = async (
  documentId: string,
  visitedDocuments: Set<string> = new Set(),
): Promise<number> => {
  if (visitedDocuments.has(documentId)) return 0;
  visitedDocuments.add(documentId);

  const document = await db.query.documentsTable.findFirst({
    where: eq(documentsTable.id, documentId),
    with: { currentRevision: true },
  });

  if (!document) return 0;

  let total = 512;

  if (document.currentRevision) {
    const revisionPath = getRevisionContentPhysicalPath(document.currentRevision.id);
    total += await stat(revisionPath).then(
      (info) => info.size,
      () => 0,
    );
    total += document.currentRevision.text?.length ?? 0;
  }

  for (const file of await listDocumentAttachmentFiles(documentId)) {
    const size = await stat(file.path).then(
      (info) => info.size,
      () => 0,
    );
    total += Math.ceil(size * BASE64_OVERHEAD) + file.filename.length + 64;
  }

  for (const child of await childDocumentsOf(documentId)) {
    total += await estimateExportBytes(child.id, visitedDocuments);
  }

  return total;
};

export const streamDocumentTree = async function* (
  documentId: string,
  visitedDocuments: Set<string> = new Set(),
  currentDepth: number = 0,
): AsyncGenerator<string> {
  if (visitedDocuments.has(documentId)) {
    throw new Error(`Circular reference detected: document ${documentId} was already processed`);
  }

  if (currentDepth >= MAX_IMPORT_DEPTH) {
    throw new Error(`Maximum depth reached: ${currentDepth} levels of nested documents`);
  }

  visitedDocuments.add(documentId);

  const document = await db.query.documentsTable.findFirst({
    where: eq(documentsTable.id, documentId),
    with: { currentRevision: true },
  });

  if (!document) {
    throw new Error(`Document ${documentId} not found`);
  }

  yield `{"name":${JSON.stringify(document.name)},"handle":${JSON.stringify(document.handle)},"icon":${JSON.stringify(document.icon)},"type":${JSON.stringify(document.documentType)},"position":${JSON.stringify(document.position)},"is_container":${JSON.stringify(document.isContainer)},"revision":`;

  if (document.currentRevision) {
    const content = await readRevisionContent(document.currentRevision.id);
    yield `{"text":${JSON.stringify(document.currentRevision.text)},"checksum":${JSON.stringify(document.currentRevision.checksum)},"content":${JSON.stringify(content)}}`;
  } else {
    yield 'null';
  }

  yield ',"attachments":[';

  const attachmentFiles = await listDocumentAttachmentFiles(documentId);

  for (const [index, file] of attachmentFiles.entries()) {
    if (index > 0) yield ',';
    const buffer = await readFile(file.path);
    yield `{"filename":${JSON.stringify(file.filename)},"url":${JSON.stringify(bufferToDataURL(buffer))}}`;
  }

  yield '],"children":[';

  const children = await childDocumentsOf(documentId);
  const nested = children.filter((child) => child.parentId === documentId);
  const spaceRoot = children.filter((child) => child.parentId !== documentId);

  for (const [index, child] of nested.entries()) {
    if (index > 0) yield ',';
    yield* streamDocumentTree(child.id, visitedDocuments, currentDepth + 1);
  }

  yield '],"spaceRootChildren":[';

  for (const [index, child] of spaceRoot.entries()) {
    if (index > 0) yield ',';
    yield* streamDocumentTree(child.id, visitedDocuments, currentDepth + 1);
  }

  yield ']}';
};

export const importDocumentTree = async (
  payload: ImportDocumentInput,
  userId: string,
  currentDepth: number = 0,
): Promise<{ id: string; name: string }> => {
  if (currentDepth >= MAX_IMPORT_DEPTH) {
    throw new Error(`Maximum depth reached: ${currentDepth} levels of nested documents`);
  }

  const documentBody = {
    name: payload.document.name,
    icon: payload.document.icon,
    documentType: payload.document.type as 'space' | 'folder' | 'note',
    isContainer: payload.document.is_container,
    position: payload.position ?? payload.document.position,
    spaceId: payload.spaceId ?? null,
    parentId: payload.parentId ?? null,
    clientId: null,
  };

  const newDocument = payload.document.revision
    ? await createDocumentWithRevision(
        {
          ...documentBody,
          revision: payload.document.revision,
        },
        userId,
      )
    : await createDocument(documentBody, userId);

  await Promise.all(
    payload.document.attachments.map((attachment) =>
      importDocumentAttachment(attachment, newDocument.id),
    ),
  );

  for (const child of payload.document.children) {
    await importDocumentTree(
      {
        document: child,
        type: child.type,
        spaceId: payload.spaceId,
        parentId: newDocument.id,
        position: child.position,
      },
      userId,
      currentDepth + 1,
    );
  }

  for (const spaceChild of payload.document.spaceRootChildren) {
    await importDocumentTree(
      {
        document: spaceChild,
        type: spaceChild.type,
        spaceId: newDocument.id,
        parentId: null,
        position: spaceChild.position,
      },
      userId,
      currentDepth + 1,
    );
  }

  return newDocument;
};
