/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import z from 'zod';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { documentsTable } from '../models/documents.js';
import { revisionsTable } from '../models/revisions.js';
import { Attachment } from '../services/attachments.js';
export const MAX_IMPORT_DEPTH = 100;

export const attachmentSchema = z.object({
  filename: z
    .string()
    .min(1)
    .max(255)
    .refine((value) => !/[/\\\0]/.test(value) && value !== '.' && value !== '..', {
      message: 'Attachment filename must be a bare file name, not a path.',
    }),
  url: z.string().startsWith('data:', 'Attachment url must be a data URL.'),
});

export const exportedRevisionSchema = createSelectSchema(revisionsTable, {
  text: z.string(),
  checksum: z.string().nullable(),
})
  .extend({
    content: z.string(),
  })
  .pick({
    text: true,
    checksum: true,
    content: true,
  });

const baseDocumentSchema = createSelectSchema(documentsTable);

export const exportedDocumentSchema: z.ZodType<ExportedDocument> = z.lazy(() =>
  z.object({
    name: baseDocumentSchema.shape.name,
    handle: baseDocumentSchema.shape.handle,
    icon: baseDocumentSchema.shape.icon,
    type: z.enum(['space', 'folder', 'note']),
    position: baseDocumentSchema.shape.position,
    is_container: baseDocumentSchema.shape.isContainer,
    revision: exportedRevisionSchema.nullable(),
    attachments: z.array(attachmentSchema),
    children: z.array(exportedDocumentSchema),
    spaceRootChildren: z.array(exportedDocumentSchema),
  }),
);

const importTreeDepth = (root: ExportedDocument): number => {
  let maxDepth = 0;
  const stack: Array<{ node: ExportedDocument; depth: number }> = [{ node: root, depth: 1 }];

  while (stack.length > 0) {
    const { node, depth } = stack.pop()!;
    if (depth > maxDepth) maxDepth = depth;
    for (const child of node.children) stack.push({ node: child, depth: depth + 1 });
    for (const child of node.spaceRootChildren) stack.push({ node: child, depth: depth + 1 });
  }

  return maxDepth;
};

export const importDocumentSchema = z
  .object({
    spaceId: z.uuid().optional().nullable(),
    parentId: z.uuid().optional().nullable(),
    position: z.string().optional().nullable(),
    type: z.enum(['space', 'folder', 'note']),
    document: exportedDocumentSchema,
  })
  .superRefine((value, ctx) => {
    const depth = importTreeDepth(value.document);
    if (depth > MAX_IMPORT_DEPTH) {
      ctx.addIssue({
        code: 'custom',
        message: `Document tree is nested ${depth} levels deep; the maximum is ${MAX_IMPORT_DEPTH}.`,
        path: ['document'],
      });
    }
  });

export const copyDocumentSchema = createInsertSchema(documentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  currentRevisionId: true,
  clientId: true,
  handle: true,
  isContainer: true,
  documentType: true,
  icon: true,
});

export type ExportedRevision = z.output<typeof exportedRevisionSchema>;
export type ExportedDocument = {
  name: string;
  handle: string;
  icon: string | null;
  type: 'space' | 'folder' | 'note';
  position: string | null;
  is_container: boolean;
  revision: ExportedRevision | null;
  attachments: Attachment[];
  children: ExportedDocument[];
  spaceRootChildren: ExportedDocument[];
};
export type ImportDocumentInput = z.output<typeof importDocumentSchema>;

export type CopyDocumentInput = z.output<typeof copyDocumentSchema>;
