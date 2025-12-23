import { createSelectSchema } from 'drizzle-zod';
import z from 'zod';
import { revisionsTable } from '../models/revisions.js';

export const createRevisionSchema = z.object({
  documentId: z.uuid('Invalid document ID'),
  text: z.string().min(1, 'Text is required'),
  content: z.string().min(1, 'Revision Content is required'),
  checksum: z.string().nullish(),
  revisionName: z.string().nullish(),
  makeCurrentRevision: z.boolean().optional(),
});

export const updateRevisionNameSchema = z.object({
  revisionName: z.string().min(1, 'New name is required'),
  content: z.undefined().optional(),
});

export const updateRevisionContentSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  content: z.string().min(1, 'Revision Content is required'),
  checksum: z.string().nullish(),
});

export const updateRevisionSchema = updateRevisionNameSchema.or(updateRevisionContentSchema);
export const revisionIdParamSchema = z.object({
  revisionId: z.uuid('Invalid revision ID'),
});

export const revisionDetailsSchema = createSelectSchema(revisionsTable).extend({
  url: z.string().min(1, 'Revision URL is required'),
  content: z.string().min(1, 'Revision Content is required'),
});

export const plainRevisionSchema = createSelectSchema(revisionsTable).extend({
  url: z.string().min(1, 'Revision URL is required'),
});

export type CreateRevisionInput = z.output<typeof createRevisionSchema>;
export type UpdateRevisionNameInput = z.output<typeof updateRevisionNameSchema>;
export type UpdateRevisionContentInput = z.output<typeof updateRevisionContentSchema>;
export type UpdateRevisionInput = z.output<typeof updateRevisionSchema>;
export type RevisionDetails = z.output<typeof revisionDetailsSchema>;
export type PlainRevision = z.output<typeof plainRevisionSchema>;
