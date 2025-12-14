import { eq } from "drizzle-orm";
import { db } from "../lib/db.js";
import { documentsTable } from "../models/documents.js";
import {
  CreateDocumentInput,
  UpdateDocumentInput,
} from "../schemas/documents.js";
import { appendUniqueSuffix, slugify } from "../utils/strings.js";

export const checkExistingDocumentHandle = async (handle: string) => {
  const result = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.handle, handle));
  return result.length > 0;
};

export const createDocument = async (
  payload: CreateDocumentInput,
  userId: string,
) => {
  let handle = slugify(payload.name);
  if (await checkExistingDocumentHandle(handle)) {
    handle = appendUniqueSuffix(handle);
  }
  return await db
    .insert(documentsTable)
    .values({
      ...payload,
      handle,
      userId,
    })
    .returning();
};

export const updateDocument = async (
  documentId: string,
  payload: UpdateDocumentInput,
) => {
  let handle;
  if (payload.name) {
    handle = slugify(payload.name);
    if (await checkExistingDocumentHandle(handle)) {
      handle = appendUniqueSuffix(handle);
    }
  }
  return await db
    .update(documentsTable)
    .set({ ...payload, handle })
    .where(eq(documentsTable.id, documentId))
    .returning();
};

export const deleteDocument = async (documentId: string) => {
  return await db
    .delete(documentsTable)
    .where(eq(documentsTable.id, documentId));
};
