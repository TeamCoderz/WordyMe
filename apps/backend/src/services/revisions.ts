/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { desc, eq, and } from 'drizzle-orm';
import { db } from '../lib/db.js';
import { revisionsTable, RevisionContentType } from '../models/revisions.js';
import {
  CreateRevisionInput,
  CreateRevisionUploadFieldsInput,
  UpdateRevisionInput,
} from '../schemas/revisions.js';
import { documentsTable } from '../models/documents.js';
import {
  getRevisionContentUrl,
  readRevisionContent,
  saveRevisionContent,
  saveRevisionContentFromFile,
  deleteRevisionContent,
} from './revision-contents.js';

const createRevisionRecord = async (
  payload: Omit<CreateRevisionInput, 'content'> & { contentType: RevisionContentType },
  userId: string,
) => {
  const [revision] = await db
    .insert(revisionsTable)
    .values({
      documentId: payload.documentId,
      text: payload.text,
      checksum: payload.checksum,
      revisionName: payload.revisionName,
      contentType: payload.contentType,
      userId,
    })
    .returning();

  return revision;
};

export const createRevision = async (payload: CreateRevisionInput, userId: string) => {
  const contentType = (payload.contentType ?? 'application/json') as RevisionContentType;

  const revision = await createRevisionRecord({ ...payload, contentType }, userId);

  await saveRevisionContent(payload.content, revision.id, contentType);

  if (payload.makeCurrentRevision) {
    await db
      .update(documentsTable)
      .set({
        currentRevisionId: revision.id,
      })
      .where(eq(documentsTable.id, payload.documentId));
  }

  return {
    ...revision,
    content: await readRevisionContent(revision.id, contentType),
    url: getRevisionContentUrl(revision.id, contentType),
  };
};

export const createJsonRevision = createRevision;

export const createRevisionFromUpload = async (
  payload: CreateRevisionUploadFieldsInput & {
    contentType: RevisionContentType;
    contentFilePath: string;
  },
  userId: string,
) => {
  const revision = await createRevisionRecord(payload, userId);

  await saveRevisionContentFromFile(payload.contentFilePath, revision.id, payload.contentType);

  if (payload.makeCurrentRevision) {
    await db
      .update(documentsTable)
      .set({
        currentRevisionId: revision.id,
      })
      .where(eq(documentsTable.id, payload.documentId));
  }

  return {
    ...revision,
    url: getRevisionContentUrl(revision.id, payload.contentType),
  };
};

export const getRevisionById = async (revisionId: string, includeContent = false) => {
  const revision = await db.query.revisionsTable.findFirst({
    where: eq(revisionsTable.id, revisionId),
  });

  if (!revision) {
    return undefined;
  }

  const contentType = revision.contentType as RevisionContentType;

  return {
    ...revision,
    ...(includeContent ? { content: await readRevisionContent(revision.id, contentType) } : {}),
    url: getRevisionContentUrl(revision.id, contentType),
  };
};

export const getRevisionsByDocumentId = async (documentId: string) => {
  const revisions = await db.query.revisionsTable.findMany({
    where: eq(revisionsTable.documentId, documentId),
    orderBy: [desc(revisionsTable.createdAt)],
  });
  return revisions.map((revision) => ({
    ...revision,
    url: getRevisionContentUrl(revision.id, revision.contentType as RevisionContentType),
  }));
};

export const getCurrentRevisionByDocumentId = async (
  documentId: string,
  includeContent = false,
) => {
  const [currentRevision] = await db
    .select({
      id: revisionsTable.id,
      text: revisionsTable.text,
      checksum: revisionsTable.checksum,
      createdAt: revisionsTable.createdAt,
      contentType: revisionsTable.contentType,
      document: {
        id: documentsTable.id,
      },
    })
    .from(revisionsTable)
    .innerJoin(
      documentsTable,
      and(
        eq(revisionsTable.documentId, documentsTable.id),
        eq(documentsTable.currentRevisionId, revisionsTable.id),
      ),
    )
    .where(eq(documentsTable.id, documentId))
    .limit(1);

  if (!currentRevision) {
    return undefined;
  }

  const contentType = currentRevision.contentType as RevisionContentType;

  return {
    ...currentRevision,
    ...(includeContent
      ? { content: await readRevisionContent(currentRevision.id, contentType) }
      : {}),
    url: getRevisionContentUrl(currentRevision.id, contentType),
  };
};

export const updateRevision = async (revisionId: string, payload: UpdateRevisionInput) => {
  const [updatedRevision] = await db
    .update(revisionsTable)
    .set(payload)
    .where(eq(revisionsTable.id, revisionId))
    .returning();
  if (!updatedRevision) {
    return null;
  }

  if (payload.content) {
    await saveRevisionContent(
      payload.content,
      revisionId,
      updatedRevision.contentType as RevisionContentType,
    );
  }

  return {
    ...updatedRevision,
    url: getRevisionContentUrl(
      updatedRevision.id,
      updatedRevision.contentType as RevisionContentType,
    ),
  };
};

export const updateRevisionName = updateRevision;

export const deleteRevisionById = async (revisionId: string) => {
  const revision = await db.query.revisionsTable.findFirst({
    where: eq(revisionsTable.id, revisionId),
  });

  if (revision) {
    await deleteRevisionContent(revision.id, revision.contentType as RevisionContentType);
  }

  const [deleted] = await db
    .delete(revisionsTable)
    .where(eq(revisionsTable.id, revisionId))
    .returning({ id: revisionsTable.id });

  return deleted;
};
