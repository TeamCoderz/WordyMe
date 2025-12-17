import z from "zod";

export const createRevisionSchema = z.object({
  documentId: z.uuid("Invalid document ID"),
  text: z.string().min(1, "Text is required"),
  content: z.string().min(1, "Revision Content is required"),
  checksum: z.string().optional(),
  revisionName: z.string().optional(),
  makeCurrentRevision: z.boolean().optional(),
});

export const updateRevisionInput = createRevisionSchema.pick({
  revisionName: true,
});

export const revisionIdParamSchema = z.object({
  revisionId: z.uuid("Invalid revision ID"),
});

export type CreateRevisionInput = z.infer<typeof createRevisionSchema>;
export type UpdateRevisionName = z.infer<typeof updateRevisionInput>;

export type RevisionDetails = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  documentId: string;
  userId: string;
  content: string;
  url: string;
  revisionName: string | null;
  text: string;
  checksum: string | null;
};

export type PlainRevision = Omit<RevisionDetails, "url">;
