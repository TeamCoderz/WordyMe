/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { PlainRevision, RevisionDetails } from '@repo/backend/revisions.js';

import type { User } from './user';
import { Pretty } from './utils/pretty';

/** Full revision including stored content (matches `revisionDetailsSchema` / rich fetch). */
export type EditorRevision = RevisionDetails;

/**
 * Revision as returned in document-centric lists where the API joins author metadata.
 * Base shape is inferred from the backend revision row schema; `author` is composed with `User`.
 */
export type Revision = Pretty<PlainRevision & { author: User }>;
