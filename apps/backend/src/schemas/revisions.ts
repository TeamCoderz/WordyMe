import z from "zod";

export const createRevisionSchema = z.object({
  documentId: z.uuid("Invalid document ID"),
  text: z.string().min(1, "Text is required"),
  content: z.string().min(1, "Revision Content is required"),
  checksum: z.string().optional(),
  revisionName: z.string().optional(),
  makeCurrentRevision: z.boolean().optional(),
});

export const updateRevisionNameSchema = z.object({
  revisionName: z.string().min(1, "New name is required"),
  content: z.undefined().optional(),
});

export const updateRevisionContentSchema = z.object({
  text: z.string().min(1, "Text is required"),
  content: z.string().min(1, "Revision Content is required"),
  checksum: z.string().optional(),
});

export const updateRevisionSchema = updateRevisionNameSchema.or(
  updateRevisionContentSchema,
);

export const revisionIdParamSchema = z.object({
  revisionId: z.uuid("Invalid revision ID"),
});

export type CreateRevisionInput = z.output<typeof createRevisionSchema>;
export type UpdateRevisionNameInput = z.output<typeof updateRevisionNameSchema>;
export type UpdateRevisionContentInput = z.output<
  typeof updateRevisionContentSchema
>;
export type UpdateRevisionInput = z.output<typeof updateRevisionSchema>;

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

export type PlainRevision = Omit<RevisionDetails, "content">;
