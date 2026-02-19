/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Alert, Announcement } from '@repo/types/ui';
import { ElementFormatType, LexicalCommand, createCommand } from 'lexical';
import { AlertVariant } from '@repo/editor/nodes/AlertNode';
import { DetailsVariant } from '@repo/editor/nodes/DetailsNode';
import { HorizontalRuleVariant } from '@repo/editor/nodes/HorizontalRuleNode';

export const MERGE_TABLE_CELLS_COMMAND: LexicalCommand<void> = createCommand();

export const DELETE_TABLE_ROW_COMMAND: LexicalCommand<void> = createCommand();

export const DELETE_TABLE_COLUMN_COMMAND: LexicalCommand<void> = createCommand();

export const INSERT_TABLE_ROW_COMMAND: LexicalCommand<boolean> = createCommand();

export const INSERT_TABLE_COLUMN_COMMAND: LexicalCommand<boolean> = createCommand();

export const TOGGLE_TABLE_CELL_WRITING_MODE_COMMAND: LexicalCommand<void> = createCommand();

export const TOGGLE_TABLE_ROW_HEADER_COMMAND: LexicalCommand<void> = createCommand();
export const TOGGLE_TABLE_COLUMN_HEADER_COMMAND: LexicalCommand<void> = createCommand();

export const TOGGLE_TABLE_ROW_STRIPING_COMMAND: LexicalCommand<void> = createCommand();

export const ALIGN_TABLE_COMMAND: LexicalCommand<ElementFormatType> = createCommand();

export const FLOAT_TABLE_COMMAND: LexicalCommand<'left' | 'right' | 'none'> = createCommand();

export const UPDATE_TABLE_CELL_COLOR_COMMAND: LexicalCommand<{
  key: string;
  value: string | null;
}> = createCommand();

export const UPDATE_TABLE_COLOR_COMMAND: LexicalCommand<{
  key: string;
  value: string | null;
}> = createCommand();

export const UPDATE_TABLE_BORDER_STYLE_COMMAND: LexicalCommand<string> = createCommand();

export const UPDATE_TABLE_BORDER_WIDTH_COMMAND: LexicalCommand<string> = createCommand();

export const FLOAT_NOTE_COMMAND: LexicalCommand<'left' | 'right'> = createCommand();

export const UPDATE_NOTE_COLOR_COMMAND: LexicalCommand<{
  key: string;
  value: string | null;
}> = createCommand();

export const UPDATE_ALERT_VARIANT_COMMAND: LexicalCommand<AlertVariant> = createCommand();

export const UPDATE_DETAILS_VARIANT_COMMAND: LexicalCommand<DetailsVariant> = createCommand();

export const TOGGLE_DETAILS_EDITABLE_COMMAND: LexicalCommand<void> = createCommand();

export const UPDATE_HORIZONTAL_RULE_VARIANT_COMMAND: LexicalCommand<HorizontalRuleVariant> =
  createCommand();

export const UPDATE_CODE_LANGUAGE_COMMAND: LexicalCommand<string> = createCommand();

export const COPY_CODE_COMMAND: LexicalCommand<void> = createCommand();

export const FLOAT_IMAGE_COMMAND: LexicalCommand<'left' | 'right' | 'none'> = createCommand();

export const TOGGLE_IMAGE_FILTER_COMMAND: LexicalCommand<void> = createCommand();

export const TOGGLE_IMAGE_CAPTION_COMMAND: LexicalCommand<void> = createCommand();

export const UPDATE_MATH_COLOR_COMMAND: LexicalCommand<{
  key: string;
  value: string | null;
}> = createCommand();

export const UPDATE_MATH_FONT_SIZE_COMMAND: LexicalCommand<string> = createCommand();

export const OPEN_MATH_EDIT_DIALOG_COMMAND: LexicalCommand<void> = createCommand();

export const OPEN_WOLFRAM_COMMAND: LexicalCommand<void> = createCommand();

export const ANNOUNCE_COMMAND: LexicalCommand<Readonly<Announcement>> = createCommand();
export const ALERT_COMMAND: LexicalCommand<Readonly<Alert>> = createCommand();
export const UPDATE_DOCUMENT_COMMAND: LexicalCommand<void> = createCommand();
export const SAVE_DOCUMENT_COMMAND: LexicalCommand<void> = createCommand();
export const SET_BLOCK_TYPE_COMMAND: LexicalCommand<string> = createCommand();
export const SET_FONT_FAMILY_COMMAND: LexicalCommand<string> = createCommand();
export const SET_FONT_SIZE_COMMAND: LexicalCommand<string> = createCommand();

export { COMMAND_PRIORITY_LOW, COMMAND_PRIORITY_NORMAL, COMMAND_PRIORITY_HIGH } from 'lexical';
