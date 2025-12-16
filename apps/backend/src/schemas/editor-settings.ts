import z from "zod";

export const editorSettingsSchema = z.object({
  keepPreviousRevision: z.boolean().optional(),
  autosave: z.boolean().optional(),
});

export type EditorSettingsInput = z.infer<
  typeof editorSettingsSchema
>;
