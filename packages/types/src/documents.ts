import { EditorRevision } from './revisions';

export interface EditorDocument {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  handle: string;
  icon: string | null;
  position: string | null;
  currentRevisionId: string | null;
  userId: string;
  parentId: string | null;
  documentType: 'space' | 'folder' | 'note';
  spaceId: string | null;
  isContainer: boolean;
  clientId: string | null;
  isFavorite: boolean;
  lastViewedAt: Date | null;
  revision: EditorRevision;
}

export type Document = Omit<EditorDocument, 'revision'>;

export type DocumentCreateInput = Omit<EditorDocument, 'author' | 'revision'>;

export type DocumentUpdateInput = Partial<Omit<EditorDocument, 'author' | 'revision'>>;

export interface DocumentStorageUsage {
  id: string;
  name: string;
  size: number;
}
