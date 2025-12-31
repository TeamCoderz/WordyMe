import type { ActiveSpace } from '@repo/types';
import { getUserDocuments } from '@repo/sdk/documents.ts';
import { TreeNode } from '@repo/lib/data/tree';
import { ListSpaceResultItem } from '@/queries/spaces';

// Simplified type alias for space data
export type SpaceData = NonNullable<Awaited<ReturnType<typeof getUserDocuments>>['data']>[number];

export interface SpaceItemProps {
  space: SpaceData;
  children?: SpaceItemProps[];
  isActive: boolean;
  isExpanded: boolean;
  isAncestor?: boolean;
  depth?: number;
  allParentsExpandedForActive?: boolean;
  openMenuSpaceId: string | null;
  onSelectSpace: (spaceId: string) => void;
  onToggleExpanded: (spaceId: string) => void;
  onOpenContextMenu: (spaceId: string) => void;
  setIsManageDisabled?: (disabled: boolean) => void;
  setCanCloseDropdown?: (canClose: boolean) => void;
  onInsertPlaceholder?: (params: {
    parentId: string | null;
    type: 'space' | 'folder';
    name?: string;
  }) => void;
  onRemovePlaceholder?: () => void;
  placeholderClientId?: string | null;
}

export interface SpaceContextMenuProps {
  space: SpaceData;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseSwitcher: () => void;
  onAddChildSpace?: (space: SpaceData) => void;
  onAddChildFolder?: (space: SpaceData) => void;
  onChangeIcon: (space: SpaceData) => void;
  onRename: (space: SpaceData) => void;
  onAddToFavorites: (space: SpaceData) => void;
  onRemoveFromFavorites: (space: SpaceData) => void;
  isFavorite?: boolean;
  onCopy?: (space: SpaceData) => void;
  onCut?: (space: SpaceData) => void;
  onPaste?: (space: SpaceData) => void;
  canPaste?: boolean;
  onDuplicate?: (space: SpaceData) => void;
  onDelete?: (space: SpaceData) => void;
}

export interface UseSpaceSwitcherReturn {
  spaces: NonNullable<Awaited<ReturnType<typeof getUserDocuments>>['data']>;
  spacesTree: TreeNode<ListSpaceResultItem>;
  activeSpace: ActiveSpace | null;
  expandedSpaces: Set<string>;
  openMenuSpaceId: string | null;
  isExpanded: (spaceId: string) => boolean;
  handleSelectSpace: (spaceId: string) => void;
  toggleExpanded: (spaceId: string) => void;
  setOpenMenuSpaceId: (spaceId: string | null) => void;
  handleEditSpace: (space: SpaceData) => void;
  handleDeleteSpace: (space: SpaceData) => void;
  handleAddChildSpace: (space: SpaceData) => void;
  getAncestorIds: (spaceId?: string, ids?: string[]) => string[];
  isLoading: boolean;
}
