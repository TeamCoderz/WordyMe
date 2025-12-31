'use client';

import * as React from 'react';
import {
  ChevronsUpDown,
  Settings2,
  BriefcaseMedical,
  Info,
  FolderClosed,
  Clipboard,
  FolderInput,
} from '@repo/ui/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  useSidebar,
} from '@repo/ui/components/sidebar';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@repo/ui/components/breadcrumb';
import { DynamicIcon } from '@repo/ui/components/dynamic-icon';
import { Skeleton } from '@repo/ui/components/skeleton';

import { TreeNode } from '@repo/lib/data/tree';
import { SpaceItem } from './SpaceItem';
import { useSpaceSwitcher } from './hooks';
import { SpaceData, SpaceItemProps } from './types';
import { useNavigate } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@repo/ui/components/context-menu';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { getAllSpacesQueryOptions, ListSpaceResult, ListSpaceResultItem } from '@/queries/spaces';
import { useSelector } from '@/store';
import {
  useCopySpaceMutation,
  useMoveSpaceMutation,
  useImportSpaceMutation,
} from '@/queries/spaces';
import { getSiblings, sortByPosition, generatePositionKeyBetween } from '@repo/lib/utils/position';
import { toast } from 'sonner';

export function SpaceSwitcher() {
  const { isMobile } = useSidebar();
  const [isSwitcherOpen, setIsSwitcherOpen] = React.useState(false);
  const [isManageDisabled, setIsManageDisabled] = React.useState(false);
  const [canCloseDropdown, setCanCloseDropdown] = React.useState(true);
  const [placeholder, setPlaceholder] = React.useState<ListSpaceResultItem | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: spacesData } = useQuery(getAllSpacesQueryOptions);

  // Merge placeholder with spaces data
  const spacesWithPlaceholder = React.useMemo(() => {
    if (!spacesData) return spacesData;
    if (!placeholder) return spacesData;
    return [...spacesData, placeholder];
  }, [spacesData, placeholder]);

  const hasPlaceholder = Boolean(placeholder);

  const {
    spacesTree,
    activeSpace,
    openMenuSpaceId,
    isExpanded,
    handleSelectSpace,
    toggleExpanded,
    setOpenMenuSpaceId,
    isLoading,
  } = useSpaceSwitcher(spacesWithPlaceholder);

  // Disable manage button when there's a placeholder or renaming
  const shouldDisableManage = hasPlaceholder || isManageDisabled;

  // Can close on escape only when not renaming or creating placeholder
  const canCloseOnEscape = !isManageDisabled && !hasPlaceholder;

  const rootSpaces = spacesTree?.children ?? [];

  const clipboardSpace = useSelector((state) => state.spacesClipboard);
  // Root-level paste mutations
  const copySpaceMutation = useCopySpaceMutation(null);
  const moveSpaceMutation = useMoveSpaceMutation(null);
  const importSpaceMutation = useImportSpaceMutation(null, null);

  const handlePaste = () => {
    if (!clipboardSpace) return;
    if (clipboardSpace.type === 'move') {
      moveSpaceMutation.mutate();
    } else {
      copySpaceMutation.mutate();
    }
  };

  const handleImport = () => {
    // Calculate position at the end of root spaces
    const currentSpaces = queryClient.getQueryData(
      getAllSpacesQueryOptions.queryKey,
    ) as ListSpaceResult;

    if (!currentSpaces) {
      toast.error('No spaces data available');
      return;
    }

    // Get root siblings (spaces with parentId null)
    const siblings = getSiblings(currentSpaces, null);
    const sortedSiblings = sortByPosition(siblings);

    let position: string;
    if (sortedSiblings.length === 0) {
      position = 'a0';
    } else {
      const lastPosition = sortedSiblings[sortedSiblings.length - 1]?.position || 'a0';
      position = generatePositionKeyBetween(lastPosition, null);
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        importSpaceMutation.mutate({ file, position });
      }
    };
    input.click();
  };

  const canPaste =
    !!clipboardSpace && (clipboardSpace.type === 'copy' || clipboardSpace.type === 'move');

  const insertPlaceholder = React.useCallback(
    (params: { parentId: string | null; type: 'space' | 'folder'; name?: string }) => {
      if (!spacesData) return;

      const resolvedParentId = params.parentId === 'root' ? null : params.parentId;
      const siblings = getSiblings(spacesData, resolvedParentId);
      const sorted = sortByPosition(siblings);

      let position: string;
      if (sorted.length === 0) position = 'a0';
      else position = generatePositionKeyBetween(sorted.at(-1)?.position || 'a0', null);

      const clientId = crypto.randomUUID();
      const newPlaceholder: ListSpaceResultItem = {
        id: 'new-space',
        clientId: clientId as any,
        name: params.name?.trim() || (params.type === 'folder' ? 'New Folder' : 'New Space'),
        handle: 'new-space',
        icon: params.type === 'space' ? 'briefcase' : 'folder-closed',
        position,
        parentId: resolvedParentId,
        spaceId: null,
        createdAt: new Date(),
        isFavorite: false,
        isContainer: params.type === 'folder',
        updatedAt: new Date(),
        lastViewedAt: null,
        documentType: 'space',
        from: 'sidebar',
        userId: '',
        currentRevisionId: null,
      };

      setPlaceholder(newPlaceholder);
    },
    [spacesData],
  );

  const removePlaceholder = React.useCallback(() => {
    setPlaceholder(null);
  }, []);

  const handleManage = () => {
    navigate({
      to: '/spaces/manage',
    });
  };

  const renderSpaceItem = ({
    data: space,
    children,
  }: Pick<TreeNode<SpaceData>, 'data' | 'children'>) => {
    const ancestorIds = activeSpace?.path?.map((p) => p.id) ?? [];
    const allParentsExpandedForActive = ancestorIds.every((id) => isExpanded(id));

    const mapChildToSpaceItemProps = (
      child: TreeNode<SpaceData>,
      depth: number = 0,
    ): SpaceItemProps => ({
      space: child.data,
      children: child.children.map((grandChild) => mapChildToSpaceItemProps(grandChild, depth + 1)),
      isActive: child.data.id === activeSpace?.id,
      isExpanded: isExpanded(child.data.id),
      isAncestor: ancestorIds.includes(child.data.id),
      depth,
      allParentsExpandedForActive,
      openMenuSpaceId,
      onSelectSpace: handleSelectSpace,
      onToggleExpanded: toggleExpanded,
      onOpenContextMenu: setOpenMenuSpaceId,
      setIsManageDisabled,
      setCanCloseDropdown,
      onInsertPlaceholder: insertPlaceholder,
      onRemovePlaceholder: removePlaceholder,
      placeholderClientId: placeholder?.clientId as string | undefined,
    });

    return (
      <SpaceItem
        key={space.clientId ?? space.id}
        space={space}
        children={children.map((child) => mapChildToSpaceItemProps(child, 0))}
        isExpanded={isExpanded(space.id)}
        depth={0}
        allParentsExpandedForActive={allParentsExpandedForActive}
        openMenuSpaceId={openMenuSpaceId}
        onSelectSpace={handleSelectSpace}
        onToggleExpanded={toggleExpanded}
        onOpenContextMenu={setOpenMenuSpaceId}
        onCloseContextMenu={() => setOpenMenuSpaceId(null)}
        onCloseSwitcher={() => setIsSwitcherOpen(false)}
        setIsManageDisabled={setIsManageDisabled}
        setCanCloseDropdown={setCanCloseDropdown}
        onInsertPlaceholder={insertPlaceholder}
        onRemovePlaceholder={removePlaceholder}
        placeholderClientId={placeholder?.clientId as string | undefined}
      />
    );
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="w-full space-y-2">
          <DropdownMenu
            open={isSwitcherOpen}
            onOpenChange={(open) => {
              if (!open && !canCloseDropdown) {
                // Prevent closing when renaming or creating
                return;
              }
              setIsSwitcherOpen(open);
            }}
          >
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="bg-sidebar-accent/50 data-[state=open]:bg-sidebar-accent text-sidebar-accent-foreground overflow-hidden"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2 w-full">
                    <Skeleton className="size-4" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                ) : activeSpace ? (
                  <>
                    {activeSpace.path && activeSpace.path.length > 0 ? (
                      <div className="flex items-center gap-2 flex-1 text-foreground">
                        <DynamicIcon
                          name={
                            activeSpace.path[activeSpace.path.length - 1]?.icon ?? 'folder-closed'
                          }
                          className="size-4"
                        />
                        <Breadcrumb className="flex-1">
                          <BreadcrumbList className="flex-nowrap overflow-hidden">
                            {activeSpace.path.length === 1 ? (
                              // Show only the single path item
                              <>
                                <BreadcrumbItem>
                                  <BreadcrumbPage className="text-xs font-medium truncate">
                                    {activeSpace.path[0]?.name}
                                  </BreadcrumbPage>
                                </BreadcrumbItem>
                              </>
                            ) : activeSpace.path.length === 2 ? (
                              // Show both path items
                              <>
                                {activeSpace.path.map((pathSpace, index) => (
                                  <React.Fragment key={pathSpace.id}>
                                    <BreadcrumbItem>
                                      {index === activeSpace.path.length - 1 ? (
                                        <BreadcrumbPage className="text-xs font-medium truncate overflow-hidden">
                                          {pathSpace.name}
                                        </BreadcrumbPage>
                                      ) : (
                                        <BreadcrumbPage className="text-xs truncate font-medium overflow-hidden">
                                          {pathSpace.name}
                                        </BreadcrumbPage>
                                      )}
                                    </BreadcrumbItem>
                                    {index < activeSpace.path.length - 1 && (
                                      <BreadcrumbSeparator className="text-foreground" />
                                    )}
                                  </React.Fragment>
                                ))}
                              </>
                            ) : (
                              // Show first + ellipsis + last (3+ items)
                              <>
                                <BreadcrumbItem>
                                  <BreadcrumbPage className="text-xs truncate font-medium overflow-hidden">
                                    {activeSpace.path[0]?.name}
                                  </BreadcrumbPage>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="text-foreground" />
                                <BreadcrumbItem>
                                  <BreadcrumbEllipsis className="text-xs overflow-hidden text-foreground" />
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="text-foreground" />
                                <BreadcrumbItem>
                                  <BreadcrumbPage className="text-xs font-medium truncate overflow-hidden">
                                    {activeSpace.path[activeSpace.path.length - 1]?.name}
                                  </BreadcrumbPage>
                                </BreadcrumbItem>
                              </>
                            )}
                          </BreadcrumbList>
                        </Breadcrumb>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-foreground">
                        <DynamicIcon name={activeSpace.icon ?? 'briefcase'} className="size-4" />
                        <span className="text-sm font-medium">{activeSpace.name}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center text-sm font-medium text-muted-foreground">
                    Select a space
                  </div>
                )}
                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] max-w-[280px] md:max-w-[360px] min-w-56 max-h-80 rounded-lg p-1 flex flex-col overflow-hidden"
              align="start"
              side={isMobile ? 'bottom' : 'right'}
              sideOffset={4}
              onEscapeKeyDown={
                canCloseOnEscape
                  ? undefined
                  : (e) => {
                      e.preventDefault();
                      return;
                    }
              }
            >
              <DropdownMenuItem asChild disabled={shouldDisableManage}>
                <SidebarMenuButton asChild>
                  <Link
                    to="/spaces/manage"
                    className={
                      shouldDisableManage ? 'cursor-default pointer-events-none' : 'cursor-pointer'
                    }
                    tabIndex={shouldDisableManage ? -1 : 0}
                    onMouseDown={(e) => {
                      if (shouldDisableManage) e.preventDefault();
                    }}
                  >
                    <Settings2 className="mr-2 h-4 w-4" />
                    Manage Spaces
                  </Link>
                </SidebarMenuButton>
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              {/* Scrollable space items */}
              <SidebarMenu className="bg-sidebar text-sidebar-foreground w-64 max-h-80 overflow-x-hidden overflow-y-auto scrollbar-thin space-y-0.5 min-h-0">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <SidebarMenuSkeleton key={index} showIcon />
                  ))
                ) : (
                  <>{rootSpaces.map((space: TreeNode<SpaceData>) => renderSpaceItem(space))}</>
                )}
              </SidebarMenu>

              {/* Fixed create section at bottom */}
              <div className="relative flex-shrink-0 mt-1">
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <SidebarMenuButton
                      className="border-1 border-dashed rounded-md select-none bg-accent/50 hover:bg-accent/70 flex items-center gap-2 text-muted-foreground"
                      onSelect={(e) => {
                        // Prevent the dropdown from closing when clicking
                        e.preventDefault();
                      }}
                    >
                      <Info className="size-4" />
                      <div className="font-medium text-sm truncate">Right-click to create</div>
                    </SidebarMenuButton>
                  </ContextMenuTrigger>
                  <ContextMenuContent
                    className="p-2"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onCloseAutoFocus={(e) => {
                      e.preventDefault();
                      return;
                    }}
                  >
                    <ContextMenuItem
                      className="group"
                      onSelect={() => {
                        insertPlaceholder({ parentId: null, type: 'space' });
                      }}
                    >
                      <BriefcaseMedical className="mr-2 h-4 w-4" />
                      Create a space
                    </ContextMenuItem>
                    <ContextMenuItem
                      className="group"
                      onSelect={() => {
                        insertPlaceholder({ parentId: null, type: 'folder' });
                      }}
                    >
                      <FolderClosed className="mr-2 h-4 w-4" />
                      Create a folder
                    </ContextMenuItem>
                    <ContextMenuSeparator />

                    <ContextMenuItem className="group" onSelect={handlePaste} disabled={!canPaste}>
                      <Clipboard className="mr-2 h-4 w-4" />
                      Paste
                    </ContextMenuItem>
                    <ContextMenuItem className="group" onSelect={handleImport}>
                      <FolderInput className="mr-2 h-4 w-4" />
                      Import Space
                    </ContextMenuItem>

                    <ContextMenuSeparator />
                    <ContextMenuItem className="group" onSelect={handleManage}>
                      <Settings2 className="mr-2 h-4 w-4" />
                      Manage Spaces
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
