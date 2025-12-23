import z from 'zod';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { documentsTable } from '../models/documents.js';
import { revisionsTable } from '../models/revisions.js';
import { Attachment } from '../services/attachments.js';

export const attachmentSchema = z.object({
  filename: z.string(),
  url: z.string(),
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
    type: baseDocumentSchema.shape.documentType,
    position: baseDocumentSchema.shape.position,
    is_container: baseDocumentSchema.shape.isContainer,
    revision: exportedRevisionSchema.nullable(),
    attachments: z.array(attachmentSchema),
    children: z.array(exportedDocumentSchema),
    spaceRootChildren: z.array(exportedDocumentSchema),
  }),
);

export const importDocumentSchema = z.object({
  spaceId: z.uuid().optional().nullable(),
  parentId: z.uuid().optional().nullable(),
  position: z.string().optional().nullable(),
  document: exportedDocumentSchema,
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
  type: string;
  position: string | null;
  is_container: boolean;
  revision: ExportedRevision | null;
  attachments: Attachment[];
  children: ExportedDocument[];
  spaceRootChildren: ExportedDocument[];
};
export type ImportDocumentInput = z.output<typeof importDocumentSchema>;
export type ImportInheritedData = {
  spaceId?: string | null;
  parentId?: string | null;
  position?: string | null;
};
export type CopyDocumentInput = z.output<typeof copyDocumentSchema>;
