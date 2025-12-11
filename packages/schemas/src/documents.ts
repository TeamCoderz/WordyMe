import z from "zod";

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

export const a = 3;

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
