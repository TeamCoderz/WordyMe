/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { ActiveSpace, Document, DocumentList } from '@repo/types';
import { TreeNode } from '@repo/lib/data/tree';

/** Row in the space switcher / manage tree (`documentType: 'space'` from API). */
export type SpaceData = Document;

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
  spaces: DocumentList;
  spacesTree: TreeNode<Document>;
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
