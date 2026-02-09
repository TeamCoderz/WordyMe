import { User } from './user';
import { EditorRevision } from './revisions';

export interface EditorDocument {
  id: string;
  handle: string;
  name: string;
  head: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  spaceId: string | null;
  type: 'space' | 'folder' | 'note';
  documentViews: {
    lastViewedAt: string;
  }[];
  // baseId?: string | null;
  parentId: string | null;
  position: string | null;
  icon: string | null;
  author: User;
  revision: EditorRevision;
  isFavorite: boolean;
  isContainer: boolean;
  clientId: string | null;
  lastViewedAt: string | null;
}

export type Document = Omit<EditorDocument, 'revision'>;

export type DocumentCreateInput = Omit<EditorDocument, 'author' | 'revision'>;

export type DocumentUpdateInput = Partial<Omit<EditorDocument, 'author' | 'revision'>>;

export interface DocumentStorageUsage {
  id: string;
  name: string;
  size: number;
}
