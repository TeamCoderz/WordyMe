import z from "zod";
import { paginationQuerySchema } from "./pagination.js";

export const documentIdParamSchema = z.object({
  documentId: z.uuid("Invalid document ID"),
});

export const documentFiltersSchema = z.object({
  search: z.string().optional(),
  documentType: z.enum(["space", "folder", "note"]).optional(),
  spaceId: z.uuid().optional(),
  parentId: z.uuid().optional(),
  orderBy: z.enum(["name", "createdAt", "lastViewedAt"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  days: z.coerce.number().min(1).optional(),
});

export type DocumentFilters = z.output<typeof documentFiltersSchema>;

export const documentHandleParamSchema = z.object({
  handle: z.string().min(1, "Handle is required"),
});

export type DocumentIdentifier =
  | {
      documentId: string;
      handle?: undefined;
    }
  | {
      documentId?: undefined;
      handle: string;
    };

export const createDocumentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  icon: z.string().nullish(),
  position: z.string().nullish(),
  parentId: z.uuid().nullish(),
  spaceId: z.uuid().nullish(),
  documentType: z.enum(["space", "folder", "note"]),
  clientId: z.string().optional(),
  isContainer: z.boolean().optional(),
});

export type CreateDocumentInput = z.output<typeof createDocumentSchema>;

export const updateDocumentSchema = createDocumentSchema.partial();

export type UpdateDocumentInput = z.output<typeof updateDocumentSchema>;

export type DocumentDetails = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  handle: string;
  icon: string | null;
  position: string | null;
  currentRevisionId: string | null;
  parentId: string | null;
  documentType: "space" | "folder" | "note";
  spaceId: string | null;
  isContainer: boolean;
  clientId: string | null;
  currentRevision: {
    id: string;
    createdAt: Date;
    documentId: string;
    userId: string;
    revisionName: string | null;
    text: string;
    checksum: string | null;
    url?: string;
    content?: string;
  } | null;
  views?: {
    id: string;
    documentId: string;
    userId: string;
    createdAt: Date;
    lastViewedAt: Date;
  }[];
  favorites?: {
    id: string;
    documentId: string;
    userId: string;
    createdAt: Date;
  }[];
  isFavorite: boolean;
  lastViewedAt: Date | null;
};

export type PlainDocument = Omit<
  DocumentDetails,
  "currentRevision" | "views" | "favorites" | "isFavorite" | "lastViewedAt"
>;

export type DocumentListItem = PlainDocument & {
  isFavorite: boolean;
  lastViewedAt: Date | null;
};
