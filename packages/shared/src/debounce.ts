/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';
export const debounce = <Args extends unknown[], Return>(
  func: (...args: Args) => Return,
  waitFor: number,
) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Args): void => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
};
