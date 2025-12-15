import z from "zod";

export const updateEditorSettingsSchema = z.object({
  keepPreviousRevision: z.boolean().optional(),
  autosave: z.boolean().optional(),
});

export const createEditorSettingsSchema = z.object({
  keepPreviousRevision: z.boolean().optional(),
  autosave: z.boolean().optional(),
});

export type UpdateEditorSettingsInput = z.infer<
  typeof updateEditorSettingsSchema
>;

export type CreateEditorSettingsInput = z.infer<
  typeof createEditorSettingsSchema
>;
