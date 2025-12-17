import z from "zod";

export const documentIdParamSchema = z.object({
  documentId: z.uuid("Invalid document ID"),
});

export type DocumentIdParamInput = z.infer<typeof documentIdParamSchema>;

export type Favorite = {
  id: string;
  documentId: string;
  userId: string;
};
