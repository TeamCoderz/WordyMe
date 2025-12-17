import z from "zod";

export const documentIdParamSchema = z.object({
  documentId: z.uuid("Invalid document ID"),
});

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
  icon: z.string().optional(),
  position: z.string().optional(),
  parentId: z.uuid().optional(),
  spaceId: z.uuid().optional(),
  documentType: z.enum(["space", "folder", "note"]),
  clientId: z.string().optional(),
  isContainer: z.boolean().optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const updateDocumentSchema = createDocumentSchema.partial();

export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

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
  currentRevision: {
    documentId: string;
    revisionId: string;
    revisionName: string | null;
    text: string;
    checksum: string | null;
  } | null;
  views: {
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    lastViewedAt: Date | null;
  }[];
  favorites: {
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
