import { db } from "../lib/db.js";
import { editorSettingsTable } from "../models/editor-settings.js";
import {
  EditorSettingsInput,
} from "../schemas/editor-settings.js";

export const setEditorSettings = async (
  userId: string,
  payload: EditorSettingsInput,
) => {
  const [created] = await db
    .insert(editorSettingsTable)
    .values({
      ...payload,
      userId,
    })
    .onConflictDoUpdate({ target: editorSettingsTable.userId, set: payload })
    .returning();

  return created;
};

