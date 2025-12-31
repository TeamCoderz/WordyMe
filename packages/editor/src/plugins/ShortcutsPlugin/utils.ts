/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { IS_APPLE } from '@lexical/utils';
import { isModifierMatch } from 'lexical';

const CONTROL_OR_META = { ctrlKey: !IS_APPLE, metaKey: IS_APPLE };

export function isFormatParagraph(event: KeyboardEvent): boolean {
  const { code } = event;

  return (
    (code === 'Numpad0' || code === 'Digit0') &&
    isModifierMatch(event, { ...CONTROL_OR_META, altKey: true })
  );
}

export function isFormatHeading(event: KeyboardEvent): boolean {
  const { code } = event;

  // Apple pencil keyboard events don't have a code property
  if (!code) {
    return false;
  }

  const keyNumber = code[code.length - 1];

  return (
    ['1', '2', '3', '4', '5', '6'].includes(keyNumber) &&
    isModifierMatch(event, { ...CONTROL_OR_META, altKey: true })
  );
}

export function isFormatNumberedList(event: KeyboardEvent): boolean {
  const { code } = event;
  return (
    (code === 'Numpad7' || code === 'Digit7') &&
    isModifierMatch(event, { ...CONTROL_OR_META, shiftKey: true })
  );
}

export function isFormatBulletList(event: KeyboardEvent): boolean {
  const { code } = event;
  return (
    (code === 'Numpad8' || code === 'Digit8') &&
    isModifierMatch(event, { ...CONTROL_OR_META, shiftKey: true })
  );
}

export function isFormatCheckList(event: KeyboardEvent): boolean {
  const { code } = event;
  return (
    (code === 'Numpad9' || code === 'Digit9') &&
    isModifierMatch(event, { ...CONTROL_OR_META, shiftKey: true })
  );
}

export function isFormatCode(event: KeyboardEvent): boolean {
  const { code } = event;
  return code === 'KeyC' && isModifierMatch(event, { ...CONTROL_OR_META, altKey: true });
}

export function isFormatQuote(event: KeyboardEvent): boolean {
  const { code } = event;
  return (
    code === 'KeyQ' &&
    isModifierMatch(event, {
      ctrlKey: true,
      shiftKey: true,
    })
  );
}

export function isLowercase(event: KeyboardEvent): boolean {
  const { code } = event;
  return (
    (code === 'Numpad1' || code === 'Digit1') &&
    isModifierMatch(event, { ctrlKey: true, shiftKey: true })
  );
}

export function isUppercase(event: KeyboardEvent): boolean {
  const { code } = event;
  return (
    (code === 'Numpad2' || code === 'Digit2') &&
    isModifierMatch(event, { ctrlKey: true, shiftKey: true })
  );
}

export function isCapitalize(event: KeyboardEvent): boolean {
  const { code } = event;
  return (
    (code === 'Numpad3' || code === 'Digit3') &&
    isModifierMatch(event, { ctrlKey: true, shiftKey: true })
  );
}

export function isStrikeThrough(event: KeyboardEvent): boolean {
  const { code } = event;
  return code === 'KeyX' && isModifierMatch(event, { ...CONTROL_OR_META, shiftKey: true });
}

export function isIndent(event: KeyboardEvent): boolean {
  const { code } = event;
  return code === 'BracketRight' && isModifierMatch(event, CONTROL_OR_META);
}

export function isOutdent(event: KeyboardEvent): boolean {
  const { code } = event;
  return code === 'BracketLeft' && isModifierMatch(event, CONTROL_OR_META);
}

export function isCenterAlign(event: KeyboardEvent): boolean {
  const { code } = event;
  return code === 'KeyE' && isModifierMatch(event, { ...CONTROL_OR_META, shiftKey: true });
}

export function isLeftAlign(event: KeyboardEvent): boolean {
  const { code } = event;
  return code === 'KeyL' && isModifierMatch(event, { ...CONTROL_OR_META, shiftKey: true });
}

export function isRightAlign(event: KeyboardEvent): boolean {
  const { code } = event;
  return code === 'KeyR' && isModifierMatch(event, { ...CONTROL_OR_META, shiftKey: true });
}

export function isJustifyAlign(event: KeyboardEvent): boolean {
  const { code } = event;
  return code === 'KeyJ' && isModifierMatch(event, { ...CONTROL_OR_META, shiftKey: true });
}

export function isSubscript(event: KeyboardEvent): boolean {
  const { code } = event;
  return code === 'Comma' && isModifierMatch(event, CONTROL_OR_META);
}

export function isSuperscript(event: KeyboardEvent): boolean {
  const { code } = event;
  return code === 'Period' && isModifierMatch(event, CONTROL_OR_META);
}

export function isInsertCodeBlock(event: KeyboardEvent): boolean {
  const { code } = event;
  return code === 'KeyC' && isModifierMatch(event, { ...CONTROL_OR_META, shiftKey: true });
}

export function isIncreaseFontSize(event: KeyboardEvent): boolean {
  const { code } = event;
  return code === 'Period' && isModifierMatch(event, { ...CONTROL_OR_META, shiftKey: true });
}

export function isDecreaseFontSize(event: KeyboardEvent): boolean {
  const { code } = event;
  return code === 'Comma' && isModifierMatch(event, { ...CONTROL_OR_META, shiftKey: true });
}

export function isClearFormatting(event: KeyboardEvent): boolean {
  const { code } = event;
  return code === 'Backslash' && isModifierMatch(event, CONTROL_OR_META);
}

export function isInsertLink(event: KeyboardEvent): boolean {
  const { code } = event;
  return code === 'KeyK' && isModifierMatch(event, CONTROL_OR_META);
}

export function isHighlight(event: KeyboardEvent): boolean {
  const { code } = event;
  return code === 'KeyH' && isModifierMatch(event, { ...CONTROL_OR_META, shiftKey: true });
}

export function isAddComment(event: KeyboardEvent): boolean {
  const { code } = event;
  return code === 'KeyM' && isModifierMatch(event, { ...CONTROL_OR_META, altKey: true });
}

export function isCode(event: KeyboardEvent): boolean {
  const { code } = event;
  return code === 'KeyE' && isModifierMatch(event, CONTROL_OR_META);
}
