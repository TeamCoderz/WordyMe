import { and, eq } from "drizzle-orm";
import { db } from "../lib/db.js";
import { documentsTable } from "../models/documents.js";
import { revisionsTable } from "../models/revisions.js";

export const userHasDocument = async (userId: string, documentId: string) => {
  const document = await db
    .select({ id: documentsTable.id })
    .from(documentsTable)
    .where(
      and(eq(documentsTable.id, documentId), eq(documentsTable.userId, userId)),
    );
  return document.length > 0;
};

export const userHasRevision = async (userId: string, revisionId: string) => {
  const exists = await db
    .select({ id: revisionsTable.id })
    .from(revisionsTable)
    .innerJoin(documentsTable, eq(documentsTable.id, revisionsTable.documentId))
    .where(
      and(eq(revisionsTable.id, revisionId), eq(documentsTable.userId, userId)),
    );
  return exists.length > 0;
};

export const hasMultipleDocuments = async (userId: string) => {
  const documents = await db
    .select({ id: documentsTable.id })
    .from(documentsTable)
    .where(eq(documentsTable.userId, userId))
    .limit(2);
  return documents.length > 1;
};
