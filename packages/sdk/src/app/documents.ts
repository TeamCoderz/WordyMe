import { CreateDocumentInput, PlainDocument } from "@repo/backend/documents.js";
import { post } from "./client.js";

export const createDocument = async (data: CreateDocumentInput) => {
  return await post<PlainDocument>("/documents", data);
};
