/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/** Flattens intersections for clearer editor hovers and error messages. */
export type Pretty<T> = { [K in keyof T]: T[K] } & unknown;
