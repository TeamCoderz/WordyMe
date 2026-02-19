/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import crypto from 'node:crypto';
import { integer, sqliteTable, text, real } from 'drizzle-orm/sqlite-core';
import { enumType } from '../utils/drizzle.js';
import { relations } from 'drizzle-orm';
import { users } from './auth.js';

export const userImagesTable = sqliteTable('user_images', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
  imageType: enumType(['avatar', 'cover'] as const, 'image_type'),
  path: text(),
  zoom: real(),
  height: integer(),
  width: integer(),
  x: integer(),
  y: integer(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
});

export const userImageRelations = relations(userImagesTable, ({ one }) => ({
  user: one(users, {
    fields: [userImagesTable.userId],
    references: [users.id],
  }),
}));
