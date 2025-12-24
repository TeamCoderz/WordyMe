import { ContainerDocumentItem } from './ContainerDocumentItem';
import { RegularDocumentItem } from './RegularDocumentItem';
import { DocumentItemProps } from './types';

export function DocumentItem({
  document,
  children,
  isExpanded,
  isAncestor,
  depth,
  openMenuDocumentId,
  onSelectDocument,
  onToggleExpanded,
  onOpenContextMenu,
  onCloseContextMenu,
  onInsertPlaceholder,
  onRemovePlaceholder,
  placeholderClientId,
}: Omit<DocumentItemProps, 'isActive'> & {
  onCloseContextMenu: () => void;
  onInsertPlaceholder?: (params: {
    parentId: string | null;
    type: 'note' | 'folder';
    name?: string;
  }) => void;
  onRemovePlaceholder?: () => void;
  placeholderClientId?: string | null;
}) {
  const isContainer = (document as any).isContainer === true;

  if (isContainer) {
    return (
      <ContainerDocumentItem
        document={document}
        isExpanded={isExpanded}
        isAncestor={isAncestor}
        depth={depth}
        openMenuDocumentId={openMenuDocumentId}
        onSelectDocument={onSelectDocument}
        onToggleExpanded={onToggleExpanded}
        onOpenContextMenu={onOpenContextMenu}
        onCloseContextMenu={onCloseContextMenu}
        onInsertPlaceholder={onInsertPlaceholder}
        onRemovePlaceholder={onRemovePlaceholder}
        placeholderClientId={placeholderClientId}
      >
        {children &&
          children.map((childProps) => (
            <DocumentItem
              key={childProps.document.id}
              {...childProps}
              onCloseContextMenu={onCloseContextMenu}
            />
          ))}
      </ContainerDocumentItem>
    );
  }

  return (
    <RegularDocumentItem
      document={document}
      depth={depth}
      openMenuDocumentId={openMenuDocumentId}
      onSelectDocument={onSelectDocument}
      onOpenContextMenu={onOpenContextMenu}
      onCloseContextMenu={onCloseContextMenu}
      onInsertPlaceholder={onInsertPlaceholder}
      onRemovePlaceholder={onRemovePlaceholder}
      placeholderClientId={placeholderClientId}
    />
  );
}
