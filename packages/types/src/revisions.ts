import { User } from './user';
import type { SerializedEditorState } from 'lexical';

export interface EditorRevision {
  id: string;
  documentId: string;
  data: SerializedEditorState;
  checksum: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  name?: string | null;
}

export type Revision = Omit<EditorRevision, 'data'> & { author: User };

export type RevisionCreateInput = Omit<EditorRevision, 'author'>;

export type RevisionUpdateInput = Partial<{
  name: string | null;
}>;
