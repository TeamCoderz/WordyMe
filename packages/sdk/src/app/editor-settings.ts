/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { EditorSettings, EditorSettingsInput } from '@repo/backend/editor-settings.js';
import { patch } from './client.js';

export const updateEditorSettings = async (data: EditorSettingsInput) => {
  return await patch<EditorSettings>('/editor-settings', data);
};
