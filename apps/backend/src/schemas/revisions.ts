/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import z from 'zod';
import { revisionsTable } from '../models/revisions.js';

export const revisionIdParamSchema = z.object({
  revisionId: z.uuid('Invalid revision ID'),
});

export const createRevisionSchema = createInsertSchema(revisionsTable)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    userId: true,
  })
  .extend({
    content: z.string().min(1, 'Revision Content is required'),
    makeCurrentRevision: z.boolean().optional(),
  });

export const updateRevisionNameSchema = createUpdateSchema(revisionsTable)
  .pick({
    revisionName: true,
  })
  .extend({
    content: z.string().optional(),
  });

export const updateRevisionContentSchema = createUpdateSchema(revisionsTable)
  .pick({
    text: true,
    checksum: true,
  })
  .extend({
    content: z.string().min(1, 'Revision Content is required'),
  });

export const updateRevisionSchema = updateRevisionNameSchema.or(updateRevisionContentSchema);

export const plainRevisionSchema = createSelectSchema(revisionsTable)
  .omit({ createdAt: true, updatedAt: true })
  .extend({
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    url: z.string().min(1, 'Revision URL is required'),
  });

export const revisionDetailsSchema = createSelectSchema(revisionsTable)
  .omit({ createdAt: true, updatedAt: true })
  .extend({
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    url: z.string().min(1, 'Revision URL is required'),
    content: z.string().min(1, 'Revision Content is required'),
  });

export type CreateRevisionInput = z.output<typeof createRevisionSchema>;
export type UpdateRevisionNameInput = z.output<typeof updateRevisionNameSchema>;
export type UpdateRevisionContentInput = z.output<typeof updateRevisionContentSchema>;
export type UpdateRevisionInput = z.output<typeof updateRevisionSchema>;
export type PlainRevision = z.output<typeof plainRevisionSchema>;
export type RevisionDetails = z.output<typeof revisionDetailsSchema>;
