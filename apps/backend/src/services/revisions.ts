import { desc, eq, and } from "drizzle-orm";
import { db } from "../lib/db.js";
import { revisionsTable } from "../models/revisions.js";
import {
  CreateRevisionInput,
  UpdateRevisionInput,
} from "../schemas/revisions.js";
import { documentsTable } from "../models/documents.js";
import {
  getRevisionContentUrl,
  readRevisionContent,
  saveRevisionContent,
} from "./revision-contents.js";

export const createRevision = async (
  payload: CreateRevisionInput,
  userId: string,
) => {
  const [revision] = await db
    .insert(revisionsTable)
    .values({
      documentId: payload.documentId,
      text: payload.text,
      checksum: payload.checksum,
      revisionName: payload.revisionName,
      userId,
    })
    .returning();

  await saveRevisionContent(payload.content, revision.id);

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
    content: payload.content,
    url: getRevisionContentUrl(revision.id),
  };
};

export const getRevisionById = async (revisionId: string) => {
  const revision = await db.query.revisionsTable.findFirst({
    where: eq(revisionsTable.id, revisionId),
  });
  return revision
    ? {
        ...revision,
        content: await readRevisionContent(revision.id),
        url: getRevisionContentUrl(revision.id),
      }
    : undefined;
};

export const getRevisionsByDocumentId = async (documentId: string) => {
  const revisions = await db.query.revisionsTable.findMany({
    where: eq(revisionsTable.documentId, documentId),
    orderBy: [desc(revisionsTable.createdAt)],
  });
  return revisions.map((revision) => ({
    ...revision,
    url: getRevisionContentUrl(revision.id),
  }));
};

export const getCurrentRevisionByDocumentId = async (documentId: string) => {
  const [currentRevision] = await db
    .select({
      id: revisionsTable.id,
      text: revisionsTable.text,
      checksum: revisionsTable.checksum,
      createdAt: revisionsTable.createdAt,
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

  return currentRevision
    ? {
        ...currentRevision,
        content: await readRevisionContent(currentRevision.id),
        url: getRevisionContentUrl(currentRevision.id),
      }
    : undefined;
};

export const updateRevisionName = async (
  revisionId: string,
  payload: UpdateRevisionInput,
) => {
  const [updatedRevision] = await db
    .update(revisionsTable)
    .set(payload)
    .where(eq(revisionsTable.id, revisionId))
    .returning();
  if (payload.content) {
    await saveRevisionContent(payload.content, revisionId);
  }
  return updatedRevision
    ? { ...updatedRevision, url: getRevisionContentUrl(updatedRevision.id) }
    : null;
};

export const deleteRevisionById = async (revisionId: string) => {
  const [deleted] = await db
    .delete(revisionsTable)
    .where(eq(revisionsTable.id, revisionId))
    .returning({ id: revisionsTable.id });

  return deleted;
};
