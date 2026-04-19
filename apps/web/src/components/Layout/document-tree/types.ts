/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { ListDocumentRow } from '@repo/types';

export interface DocumentItemProps {
  document: ListDocumentRow;
  children?: DocumentItemProps[];
  isActive: boolean;
  isExpanded: boolean;
  isAncestor?: boolean;
  depth?: number;
  allParentsExpandedForActive?: boolean;
  openMenuDocumentId: string | null;
  onSelectDocument: (documentId: string) => void;
  onToggleExpanded: (documentId: string) => void;
  onOpenContextMenu: (documentId: string) => void;
}

export interface DocumentContextMenuProps {
  document: ListDocumentRow;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onChangeIcon: () => void;
  onRename: () => void;
  onCreateFolder?: () => void;
  onAddToFavorites?: () => void;
  onRemoveFromFavorites?: () => void;
  onCreateChildNote?: () => void;
  onCreateChildFolder?: () => void;
  onManage?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  canPaste?: boolean;
  onDuplicate?: () => void;
}

// Type for the tree node structure
export interface TreeNode {
  data: ListDocumentRow;
  children: TreeNode[];
}
