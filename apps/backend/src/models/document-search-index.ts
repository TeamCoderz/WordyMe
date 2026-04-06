/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import crypto from 'node:crypto';
import { relations } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { users } from './auth.js';
import { documentsTable } from './documents.js';
import { revisionsTable } from './revisions.js';

export const documentSearchIndexTable = sqliteTable(
  'document_search_index',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
    documentId: text('document_id')
      .notNull()
      .references(() => documentsTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    currentRevisionId: text('current_revision_id').references(() => revisionsTable.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    title: text('title').notNull(),
    body: text('body').notNull().default(''),
  },
  (table) => [
    uniqueIndex('document_search_index_document_id_unique').on(table.documentId),
    index('document_search_index_user_id_idx').on(table.userId),
    index('document_search_index_current_revision_id_idx').on(table.currentRevisionId),
  ],
);

export const documentSearchIndexRelations = relations(documentSearchIndexTable, ({ one }) => ({
  document: one(documentsTable, {
    fields: [documentSearchIndexTable.documentId],
    references: [documentsTable.id],
  }),
  user: one(users, {
    fields: [documentSearchIndexTable.userId],
    references: [users.id],
  }),
  currentRevision: one(revisionsTable, {
    fields: [documentSearchIndexTable.currentRevisionId],
    references: [revisionsTable.id],
  }),
}));
