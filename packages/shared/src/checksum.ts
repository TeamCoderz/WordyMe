/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { sha256 } from 'js-sha256';

/**
 * Computes SHA256 hash of a string
 * @param input - The input to hash
 * @returns The SHA256 hash as a hex string
 */
export function computeSha256(input: string | number[] | ArrayBuffer | Uint8Array): string {
  return sha256(input);
}
