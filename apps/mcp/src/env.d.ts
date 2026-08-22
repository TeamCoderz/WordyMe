/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

// The editor and sdk packages are authored for Vite; these ambient
// declarations stand in for Vite's when their sources are type-checked here.
declare module '*.css';

interface ImportMeta {
  readonly env?: Record<string, string | undefined>;
}
