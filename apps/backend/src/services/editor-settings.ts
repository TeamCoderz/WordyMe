import { eq } from "drizzle-orm";
import { db } from "../lib/db.js";
import { editorSettingsTable } from "../models/editor-settings.js";
import {
  CreateEditorSettingsInput,
  UpdateEditorSettingsInput,
} from "../schemas/editor-settings.js";

export const setEditorInitialSettings = async (
  userId: string,
  payload: CreateEditorSettingsInput,
) => {
  const [created] = await db
    .insert(editorSettingsTable)
    .values({
      ...payload,
      userId,
    })
    .onConflictDoNothing({ target: editorSettingsTable.userId })
    .returning();

  return created ?? null;
};

export const updateEditorSettings = async (
  userId: string,
  payload: UpdateEditorSettingsInput,
) => {
  const [updated] = await db
    .update(editorSettingsTable)
    .set(payload)
    .where(eq(editorSettingsTable.userId, userId))
    .returning();

  return updated ?? null;
};
