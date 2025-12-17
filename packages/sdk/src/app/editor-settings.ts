import {
  EditorSettings,
  EditorSettingsInput,
} from "@repo/backend/editor-settings.js";
import { patch } from "./client.js";

export const updateEditorSettings = async (data: EditorSettingsInput) => {
  return await patch<EditorSettings>("/editor-settings", data);
};
