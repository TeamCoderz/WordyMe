/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { createSelectSchema } from 'drizzle-zod';
import { favoritesTable } from '../models/favorites.js';
import z from 'zod';

export const favoriteSchema = createSelectSchema(favoritesTable).pick({
  id: true,
  documentId: true,
  userId: true,
});

export type Favorite = z.output<typeof favoriteSchema>;
