import * as React from 'react';
import { ChevronRight } from '@repo/ui/components/icons';
import { DynamicIcon } from '@repo/ui/components/dynamic-icon';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@repo/ui/components/input-group';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useRenameDocumentMutation,
  useCreateDocumentMutation,
  useCreateContainerDocumentMutation,
  getAllDocumentsQueryOptions,
  ListDocumentResult,
} from '@/queries/documents';
import { isDocumentCached } from '@/queries/caches/documents';
import { ContainerDocumentItem } from './ContainerDocumentItem';
import { RegularDocumentItem } from './RegularDocumentItem';
import { DocumentItemProps, DocumentData } from './types';

interface DocumentNameInputProps {
  document: DocumentData;
  mode: 'placeholder' | 'renaming';
  onRemovePlaceholder?: () => void;
  onRenameComplete?: () => void;
  onCancel?: () => void;
  isContainer?: boolean;
}

function DocumentNameInput({
  document,
  mode,
  onRemovePlaceholder,
  onRenameComplete,
  onCancel,
  isContainer = false,
}: DocumentNameInputProps) {
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = React.useState(document.name);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Mutations
  const { updateDocumentName, isPending: isRenamingPending } = useRenameDocumentMutation({
    document: document as any,
  });
  const createContainerDocumentMutation = useCreateContainerDocumentMutation({
    document: document as any,
    from: 'sidebar',
  });
  const createDocumentMutation = useCreateDocumentMutation({
    document: document as any,
    from: 'sidebar',
  });

  const isPlaceholder = mode === 'placeholder';
  const isRenaming = mode === 'renaming';

  // Handle placeholder submission
  const submitPlaceholder = React.useCallback(() => {
    if (!isPlaceholder) return;
    const name = inputValue.trim();
    if (!name) {
      onRemovePlaceholder?.();
      return;
    }

    if (isContainer) {
      createContainerDocumentMutation.mutate(
        {
          parentId: document.parentId ?? null,
          spaceId: document.spaceId,
          name,
          clientId: (document.clientId as string) ?? crypto.randomUUID(),
        },
        {
          onSuccess: (data) => {
            queryClient.setQueryData(
              getAllDocumentsQueryOptions(document.spaceId!).queryKey,
              (old: ListDocumentResult | undefined) => {
                onRemovePlaceholder?.();
                if (old) {
                  if (data && !isDocumentCached(data.clientId as string)) {
                    return [...old, data];
                  }
                }
                return old;
              },
            );
          },
          onError: () => {
            onRemovePlaceholder?.();
          },
        },
      );
    } else {
      createDocumentMutation.mutate(
        {
          parentId: document.parentId ?? null,
          spaceId: document.spaceId,
          name,
          clientId: (document.clientId as string) ?? crypto.randomUUID(),
        },
        {
          onSuccess: (data) => {
            if (data) {
              queryClient.setQueryData(
                getAllDocumentsQueryOptions(document.spaceId!).queryKey,
                (old: ListDocumentResult | undefined) => {
                  onRemovePlaceholder?.();
                  if (old) {
                    if (data && !isDocumentCached(data.clientId as string)) {
                      return [...old, data];
                    }
                  }
                  return old;
                },
              );
            }
          },
          onError: () => {
            onRemovePlaceholder?.();
          },
        },
      );
    }
  }, [
    isPlaceholder,
    inputValue,
    isContainer,
    document.parentId,
    document.spaceId,
    document.clientId,
    createContainerDocumentMutation,
    createDocumentMutation,
    queryClient,
    onRemovePlaceholder,
  ]);

  // Handle rename submission
  const submitRename = React.useCallback(async () => {
    if (!isRenaming || isRenamingPending) return;
    if (inputValue.trim() && inputValue.trim() !== document.name) {
      try {
        await updateDocumentName(document.id, inputValue.trim());
      } catch {
        toast.error('Failed to rename document');
        setInputValue(document.name); // Reset on error
      }
    }
    onRenameComplete?.();
  }, [
    isRenaming,
    isRenamingPending,
    inputValue,
    document.id,
    document.name,
    updateDocumentName,
    onRenameComplete,
  ]);

  // Handle keyboard events
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        if (isPlaceholder) {
          submitPlaceholder();
        } else {
          submitRename();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel?.();
      }
    },
    [isPlaceholder, submitPlaceholder, submitRename, onCancel],
  );

  // Handle blur
  const handleBlur = React.useCallback(() => {
    if (isPlaceholder) {
      submitPlaceholder();
    } else {
      submitRename();
    }
  }, [isPlaceholder, submitPlaceholder, submitRename]);

  // Focus management
  React.useEffect(() => {
    if (isRenaming || isPlaceholder) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 100);
    }
  }, [isRenaming, isPlaceholder]);

  // Handle click outside to save
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        (isRenaming || isPlaceholder) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        const target = event.target as Element;
        const isDocumentItem = target.closest('[data-document-id]');
        const isNavigationElement = target.closest('button, [role="button"], a, [data-command]');

        if (
          isNavigationElement ||
          (isDocumentItem && isDocumentItem.getAttribute('data-document-id') !== document.id)
        ) {
          if (isPlaceholder) {
            submitPlaceholder();
          } else {
            submitRename();
          }
        }
      }
    };

    if (isRenaming || isPlaceholder) {
      window.document.addEventListener('click', handleClickOutside);
      return () => window.document.removeEventListener('click', handleClickOutside);
    }
    return undefined;
  }, [isRenaming, isPlaceholder, document.id, submitPlaceholder, submitRename]);

  const isPending =
    (isPlaceholder &&
      (isContainer
        ? createContainerDocumentMutation.isPending || createContainerDocumentMutation.isSuccess
        : createDocumentMutation.isPending || createDocumentMutation.isSuccess)) ||
    (isRenaming && isRenamingPending);

  return (
    <InputGroup className="w-full ring-0!" onClick={(e) => e.stopPropagation()}>
      {isContainer && (
        <InputGroupAddon align="inline-start">
          <ChevronRight className="transition-transform size-4" />
        </InputGroupAddon>
      )}
      <InputGroupAddon align="inline-start">
        <DynamicIcon name={document.icon || (isContainer ? 'folder' : 'file')} className="size-4" />
      </InputGroupAddon>
      <InputGroupInput
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onKeyUp={(e) => e.stopPropagation()}
        onKeyPress={(e) => e.stopPropagation()}
        onBlur={handleBlur}
        disabled={isPending}
        className="h-6 text-sm"
      />
    </InputGroup>
  );
}

export { DocumentNameInput };

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
