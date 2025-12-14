import z from "zod";

export const createRevisionSchema = z.object({
  documentId: z.uuid("Invalid document ID"),
  text: z.string().min(1, "Text is required"),
  checksum: z.string().optional(),
  revisionName: z.string().optional(),
  makeCurrentRevision: z.boolean().optional(),
});

export type CreateRevisionInput = z.infer<typeof createRevisionSchema>;

export const updateRevisionInput = createRevisionSchema.pick({
  revisionName: true,
});

export type UpdateRevisionName = z.infer<typeof updateRevisionInput>;
