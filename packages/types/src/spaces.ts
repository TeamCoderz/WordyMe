export interface ActiveSpace extends Space {
  path: Space[];
}

export type SpaceVisibility = 'private' | 'shared' | 'public';

export interface Space {
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
}

export interface SpaceCreateInput {
  name: string;
  description: string;
  icon: string;
  parentId: Space['parentId'];
}

export interface SpaceUpdateInput {
  name?: string;
  description?: string;
  icon?: string;
}
