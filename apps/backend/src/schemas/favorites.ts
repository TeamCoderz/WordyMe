import { createSelectSchema } from 'drizzle-zod';
import { favoritesTable } from '../models/favorites.js';
import z from 'zod';

export const favoriteSchema = createSelectSchema(favoritesTable).pick({
  id: true,
  documentId: true,
  userId: true,
});

export type Favorite = z.output<typeof favoriteSchema>;
