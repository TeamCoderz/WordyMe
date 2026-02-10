import { User } from './user';
export interface EditorRevision {
  id: string;
  createdAt: string;
  updatedAt: string;
  documentId: string;
  userId: string;
  revisionName: string | null;
  text: string;
  checksum: string | null;
  url: string;
  content: string;
}

export type Revision = Omit<EditorRevision, 'content'> & { author: User };

export type RevisionCreateInput = Omit<EditorRevision, 'author'>;

export type RevisionUpdateInput = Partial<{
  name: string | null;
}>;
