import z from 'zod';

export const editorSettingsSchema = z.object({
  keepPreviousRevision: z.boolean().optional(),
  autosave: z.boolean().optional(),
});

export type EditorSettingsInput = z.output<typeof editorSettingsSchema>;

export type EditorSettings = {
  id: string;
  createdAt: Date;
  userId: string;
  keepPreviousRevision: boolean;
  autosave: boolean;
};
