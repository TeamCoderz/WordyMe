import { createSelectSchema } from 'drizzle-zod';
import z from 'zod';
import { editorSettingsTable } from '../models/editor-settings.js';

export const editorSettingsSchema = createSelectSchema(editorSettingsTable).pick({
  keepPreviousRevision: true,
  autosave: true,
});

export type EditorSettingsInput = z.output<typeof editorSettingsSchema>;
export type EditorSettings = {
  id: string;
  createdAt: Date;
  userId: string;
  keepPreviousRevision: boolean;
  autosave: boolean;
};
