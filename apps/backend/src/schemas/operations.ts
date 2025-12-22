import z from 'zod';
import { Attachment } from '../services/attachments.js';

export const copyDocumentSchema = z.object({
  name: z.string(),
  spaceId: z.uuid().optional().nullable(),
  parentId: z.uuid().optional().nullable(),
  position: z.string().optional().nullable(),
});

export type CopyDocumentInput = z.output<typeof copyDocumentSchema>;

export type ExportedRevision = {
  text: string;
  checksum: string | null;
  content: string;
};

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

export type ImportInheritedData = {
  spaceId?: string | null;
  parentId?: string | null;
  position?: string | null;
};

export const attachmentSchema = z.object({
  filename: z.string(),
  url: z.string(),
});

export const exportedRevisionSchema = z.object({
  text: z.string(),
  checksum: z.string().nullable(),
  content: z.string(),
});

export const exportedDocumentSchema: z.ZodType<ExportedDocument> = z.lazy(() =>
  z.object({
    name: z.string(),
    handle: z.string(),
    icon: z.string().nullable(),
    type: z.enum(['space', 'folder', 'note']),
    position: z.string().nullable(),
    is_container: z.boolean(),
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

export type ImportDocumentInput = z.output<typeof importDocumentSchema>;
