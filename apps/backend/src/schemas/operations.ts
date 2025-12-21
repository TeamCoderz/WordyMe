import z from "zod";

export const copyDocumentSchema = z.object({
  name: z.string(),
  spaceId: z.uuid().optional().nullable(),
  parentId: z.uuid().optional().nullable(),
  position: z.string().optional().nullable(),
});

export type CopyDocumentInput = z.output<typeof copyDocumentSchema>;
