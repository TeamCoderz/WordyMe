import { ListDocumentResult } from '@/queries/documents';

// Simplified type alias for document data
export type DocumentData = ListDocumentResult[number];

export interface DocumentItemProps {
  document: DocumentData;
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
  document: DocumentData;
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
  data: DocumentData;
  children: TreeNode[];
}
