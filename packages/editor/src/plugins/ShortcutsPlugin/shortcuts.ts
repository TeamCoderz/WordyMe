/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { IS_APPLE } from '@lexical/utils';

export const SHORTCUTS = Object.freeze({
  // (Ctrl|⌘) + (Alt|Option) + <key> shortcuts
  NORMAL: IS_APPLE ? '⌘⌥0' : 'Ctrl+Alt+0',
  HEADING1: IS_APPLE ? '⌘⌥1' : 'Ctrl+Alt+1',
  HEADING2: IS_APPLE ? '⌘⌥2' : 'Ctrl+Alt+2',
  HEADING3: IS_APPLE ? '⌘⌥3' : 'Ctrl+Alt+3',
  HEADING4: IS_APPLE ? '⌘⌥4' : 'Ctrl+Alt+4',
  HEADING5: IS_APPLE ? '⌘⌥5' : 'Ctrl+Alt+5',
  HEADING6: IS_APPLE ? '⌘⌥6' : 'Ctrl+Alt+6',
  NUMBERED_LIST: IS_APPLE ? '⌘⇧7' : 'Ctrl+⇧+7',
  BULLET_LIST: IS_APPLE ? '⌘⇧8' : 'Ctrl+⇧+8',
  CHECK_LIST: IS_APPLE ? '⌘⇧9' : 'Ctrl+⇧+9',
  CODE_BLOCK: IS_APPLE ? '⌘⌥C' : 'Ctrl+Alt+C',
  QUOTE: IS_APPLE ? '⌘⇧Q' : 'Ctrl+⇧+Q',
  ADD_COMMENT: IS_APPLE ? '⌘⌥M' : 'Ctrl+Alt+M',

  // (Ctrl|⌘) + Shift + <key> shortcuts
  INCREASE_FONT_SIZE: IS_APPLE ? '⌘⇧.' : 'Ctrl+⇧+.',
  DECREASE_FONT_SIZE: IS_APPLE ? '⌘⇧,' : 'Ctrl+⇧+,',
  INSERT_CODE_BLOCK: IS_APPLE ? '⌘⇧C' : 'Ctrl+⇧+C',
  STRIKETHROUGH: IS_APPLE ? '⌘⇧X' : 'Ctrl+⇧+X',
  LOWERCASE: IS_APPLE ? '⌃+⇧+1' : 'Ctrl+⇧+1',
  UPPERCASE: IS_APPLE ? '⌃+⇧+2' : 'Ctrl+⇧+2',
  CAPITALIZE: IS_APPLE ? '⌃+⇧+3' : 'Ctrl+⇧+3',
  CENTER_ALIGN: IS_APPLE ? '⌘⇧E' : 'Ctrl+⇧+E',
  JUSTIFY_ALIGN: IS_APPLE ? '⌘⇧J' : 'Ctrl+⇧+J',
  LEFT_ALIGN: IS_APPLE ? '⌘⇧L' : 'Ctrl+⇧+L',
  RIGHT_ALIGN: IS_APPLE ? '⌘⇧R' : 'Ctrl+⇧+R',
  HIGHLIGHT: IS_APPLE ? '⌘⇧H' : 'Ctrl+⇧+H',
  BOLD: IS_APPLE ? '⌘⇧B' : 'Ctrl+⇧+B',
  INSERT_LINK: IS_APPLE ? '⌘⇧K' : 'Ctrl+⇧+K',

  // (Ctrl|⌘) + <key> shortcuts
  SUBSCRIPT: IS_APPLE ? '⌘,' : 'Ctrl+,',
  SUPERSCRIPT: IS_APPLE ? '⌘.' : 'Ctrl+.',
  INDENT: IS_APPLE ? '⌘]' : 'Ctrl+]',
  OUTDENT: IS_APPLE ? '⌘[' : 'Ctrl+[',
  CLEAR_FORMATTING: IS_APPLE ? '⌘\\' : 'Ctrl+\\',
  REDO: IS_APPLE ? '⌘⇧Z' : 'Ctrl+Y',
  UNDO: IS_APPLE ? '⌘Z' : 'Ctrl+Z',
  ITALIC: IS_APPLE ? '⌘I' : 'Ctrl+I',
  UNDERLINE: IS_APPLE ? '⌘U' : 'Ctrl+U',
  CODE: IS_APPLE ? '⌘E' : 'Ctrl+E',

  CUT: IS_APPLE ? '⌘X' : 'Ctrl+X',
  COPY: IS_APPLE ? '⌘C' : 'Ctrl+C',
  PASTE: IS_APPLE ? '⌘V' : 'Ctrl+V',
  PASTE_PLAIN_TEXT: IS_APPLE ? '⌘⇧V' : 'Ctrl+⇧+V',
});
