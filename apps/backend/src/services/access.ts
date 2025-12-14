import { and, eq } from "drizzle-orm";
import { db } from "../lib/db.js";
import { documentsTable } from "../models/documents.js";

export const hasDocumentAccess = async (userId: string, documentId: string) => {
    const document = await db.select({ id: documentsTable.id }).from(documentsTable).where(
        and(
            eq(documentsTable.id, documentId),
            eq(documentsTable.userId, userId)
        )
    );
    return document.length > 0;
};

export const hasMultipleDocuments = async (userId: string) => {
    const documents = await db.select({ id: documentsTable.id }).from(documentsTable).where(
        eq(documentsTable.userId, userId)
    ).limit(2);
    return documents.length > 1;
};
