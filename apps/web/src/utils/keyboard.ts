/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Dispatches an Escape key event to close open menus, dialogs, or other components
 * @param target - The element to dispatch the event to (defaults to document.body)
 */
export const dispatchEscapeKey = (target: HTMLElement | Document = document.body): void => {
  const event = new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    cancelable: true,
  });

  target.dispatchEvent(event);
};
