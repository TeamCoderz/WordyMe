/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import z from 'zod';
import { DocumentDetails, PlainDocument } from './documents.js';
import { Favorite } from './favorites.js';

export const spaceIdSchema = z.uuid();

export type FavoriteRealtimeResponse = Favorite & { spaceId: string | null };

export type BackupProgress = {
  jobId: string;
  phase: 'unpacking' | 'verifying' | 'writing' | 'publishing';
  staged: number;
  total: number;
};

export type BackupRestored = {
  jobId: string;
  documents: number;
  revisions: number;
};

export type SocketEventsMap = {
  'document:created': DocumentDetails;
  'document:updated': PlainDocument;
  'document:deleted': PlainDocument;
  'document:favorited': FavoriteRealtimeResponse;
  'document:unfavorited': FavoriteRealtimeResponse;
  'space:created': DocumentDetails;
  'space:updated': PlainDocument;
  'space:deleted': PlainDocument;
  'space:favorited': FavoriteRealtimeResponse;
  'space:unfavorited': FavoriteRealtimeResponse;
  'backup:progress': BackupProgress;
  'backup:restored': BackupRestored;
  connect: void;
  disconnect: void;
};

export type SocketEventKey = keyof SocketEventsMap;
