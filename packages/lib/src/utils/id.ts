/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export function formatId(value: string) {
  return value.trim();
}

export function decodeId(value: string) {
  return decodeURIComponent(value);
}
