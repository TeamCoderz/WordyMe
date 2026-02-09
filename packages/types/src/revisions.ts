import { User } from './user';
import type { SerializedEditorState } from 'lexical';

export interface EditorRevision {
  checksum: string | null;
  created_at: string;
  document_id: string;
  id: string;
  revision_name: string | null;
  text: string;
  updated_at: string;
  data: SerializedEditorState;
}

export type Revision = Omit<EditorRevision, 'data'> & { author: User };

export type RevisionCreateInput = Omit<EditorRevision, 'author'>;

export type RevisionUpdateInput = Partial<{
  name: string | null;
}>;
