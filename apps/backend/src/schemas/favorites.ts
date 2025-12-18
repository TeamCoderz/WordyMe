import z from "zod";

export const documentIdParamSchema = z.object({
  documentId: z.uuid("Invalid document ID"),
});

export type DocumentIdParamInput = z.output<typeof documentIdParamSchema>;

export type Favorite = {
  id: string;
  documentId: string;
  userId: string;
};
