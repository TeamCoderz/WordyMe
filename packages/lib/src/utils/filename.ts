/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Sanitizes a filename by removing or replacing invalid characters
 * @param name - The filename to sanitize
 * @returns A sanitized filename safe for use across different operating systems
 */
export function sanitizeName(name: string): string {
  return (
    name
      .replace(/[<>:"/\\|?*]/g, '-') // Replace invalid filename characters
      .split('')
      .filter((char) => char.charCodeAt(0) >= 32) // Remove control characters
      .join('')
      .replace(/\s+/g, '-') // Replace whitespace with hyphens
      .replace(/-+/g, '-') // Collapse multiple hyphens
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .trim() || 'untitled'
  );
}
