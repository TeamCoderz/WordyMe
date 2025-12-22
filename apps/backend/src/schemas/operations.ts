import z from 'zod';
import { Attachment } from '../services/attachments.js';

export const copyDocumentSchema = z.object({
  name: z.string(),
  spaceId: z.uuid().optional().nullable(),
  parentId: z.uuid().optional().nullable(),
  position: z.string().optional().nullable(),
});

export type CopyDocumentInput = z.output<typeof copyDocumentSchema>;

export type ExportedDocument = {
  name: string;
  handle: string;
  icon: string | null;
  type: string;
  position: string | null;
  is_container: boolean;
  revision: {
    text: string;
    checksum: string | null;
    content: string;
  } | null;
  attachments: Attachment[];
  children: ExportedDocument[];
  spaceRootChildren: ExportedDocument[];
};
