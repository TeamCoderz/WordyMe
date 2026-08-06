/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Vite's `?url` suffix: import the asset's final URL rather than its contents,
 * so the bundler emits the file and hands back a path on our own origin.
 *
 * Declared here rather than pulling in `vite/client`, which this package does
 * not depend on and which would drag in the whole ambient environment for the
 * sake of one import.
 */
declare module '*.wasm?url' {
  const src: string;
  export default src;
}
