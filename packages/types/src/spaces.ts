export interface ActiveSpace extends Space {
  path: Space[];
}

export type SpaceVisibility = 'private' | 'shared' | 'public';

export interface Space {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string | Date;
  updatedAt: string | null;
  icon: string;
  parentId?: string | null;
  handle?: string | null;
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
