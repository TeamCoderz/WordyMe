import { desc, eq, getTableColumns, and } from "drizzle-orm";
import { db } from "../lib/db.js";
import { revisionsTable } from "../models/revisions.js";
import {
  CreateRevisionInput,
  UpdateRevisionName,
} from "../schemas/revisions.js";
import { createRevisionContentPath } from "../utils/storage-path.js";
import { documentsTable } from "../models/documents.js";

export const createRevision = async (
  payload: CreateRevisionInput,
  userId: string,
) => {
  const path = createRevisionContentPath(userId, payload.documentId);
  const revision = await db
    .insert(revisionsTable)
    .values({
      documentId: payload.documentId,
      text: payload.text,
      checksum: payload.checksum,
      revisionName: payload.revisionName,
      contentPath: path,
      userId,
    })
    .returning({ id: revisionsTable.id });

  if (!payload.makeCurrentRevision) {
    return revision[0];
  }

  await db
    .update(documentsTable)
    .set({
      currentRevisionId: revision[0].id,
    })
    .where(eq(documentsTable.id, payload.documentId));

  return revision[0];
};

export const updateRevisionName = async (
  revisionId: string,
  payload: UpdateRevisionName,
) => {
  return await db
    .update(revisionsTable)
    .set(payload)
    .where(eq(revisionsTable.id, revisionId))
    .returning({
      id: revisionsTable.id,
      revisionName: revisionsTable.revisionName,
      contentPath: revisionsTable.contentPath,
    });
};

export const getRevisionById = async (revisionId: string) => {
  const revision = await db.query.revisionsTable.findFirst({
    where: eq(revisionsTable.id, revisionId),
  });
  return revision;
};

export const getRevisionsByDocumentId = async (documentId: string) => {
  const revisions = await db.query.revisionsTable.findMany({
    where: eq(revisionsTable.documentId, documentId),
    orderBy: [desc(revisionsTable.createdAt)],
  });
  return revisions;
};

export const deleteRevisionById = async (revisionId: string) => {
  await db.delete(revisionsTable).where(eq(revisionsTable.id, revisionId));
};

export const getCurrentRevisionByDocumentId = async (documentId: string) => {
  const currentRevision = await db
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

  return currentRevision[0] ?? null;
};
