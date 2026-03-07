/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * A KeyboardEvent or structurally similar object with a string `key` as well
 * as `altKey`, `ctrlKey`, `metaKey`, and `shiftKey` boolean properties.
 */
export type KeyboardEventModifiers = Pick<
  KeyboardEvent,
  'key' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'
>;

/**
 * A record of keyboard modifiers that must be enabled.
 * If the value is `'any'` then the modifier key's state is ignored.
 * If the value is `true` then the modifier key must be pressed.
 * If the value is `false` or the property is omitted then the modifier key must
 * not be pressed.
 */
export type KeyboardEventModifierMask = {
  [K in Exclude<keyof KeyboardEventModifiers, 'key'>]?: boolean | undefined | 'any';
};

function matchModifier(
  event: KeyboardEventModifiers,
  mask: KeyboardEventModifierMask,
  prop: keyof KeyboardEventModifierMask,
): boolean {
  const expected = mask[prop] || false;
  return expected === 'any' || expected === event[prop];
}

/**
 * Match a KeyboardEvent with its expected modifier state
 *
 * @param event A KeyboardEvent, or structurally similar object
 * @param mask An object specifying the expected state of the modifiers
 * @returns true if the event matches
 */
export function isModifierMatch(
  event: KeyboardEventModifiers,
  mask: KeyboardEventModifierMask,
): boolean {
  return (
    matchModifier(event, mask, 'altKey') &&
    matchModifier(event, mask, 'ctrlKey') &&
    matchModifier(event, mask, 'shiftKey') &&
    matchModifier(event, mask, 'metaKey')
  );
}
