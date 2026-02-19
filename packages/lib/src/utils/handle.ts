/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export function formatHandle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^A-Za-z0-9]/g, '-');
}
