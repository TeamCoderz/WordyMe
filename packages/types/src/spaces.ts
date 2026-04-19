/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { Document } from './documents';
import type { Pretty } from './utils/pretty';

/** Selected workspace root row plus ancestor chain (all persisted as `documentType: 'space'`). */
export type ActiveSpace = Pretty<Document & { path: Document[] }>;

/** Not stored on the document row in the backend schema; used by client navigation / UI. */
export type SpaceVisibility = 'private' | 'shared' | 'public';
