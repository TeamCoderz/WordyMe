import { Button } from '@repo/ui/components/button';
import { PlusIcon, PencilIcon, TrashIcon, FolderIcon } from '@repo/ui/components/icons';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@repo/ui/components/card';
import { useMemo } from 'react';
import { Space } from '@repo/types/spaces';
import { alert } from '@/components/Layout/alert';
import { toast } from 'sonner';
import { DynamicIcon } from '@repo/ui/components/dynamic-icon';
import { arrayToTree } from '@repo/lib/data/tree';
import { useNavigate } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { getAllSpacesQueryOptions, useCreateSpaceMutation } from '@/queries/spaces';
import { deleteSpace } from '@repo/backend/sdk/spaces.js';
import { getAllDocumentsQueryOptions } from '@/queries/documents';
import { useSelector } from '@/store';

export function SpacesPage() {
  const { data: spaces } = useSuspenseQuery(getAllSpacesQueryOptions);
  const spaceID = useSelector((state) => state.activeSpace?.id);
  const { data: documents } = useSuspenseQuery(getAllDocumentsQueryOptions(spaceID!));
  const createSpaceMutation = useCreateSpaceMutation({ from: 'sidebar' });

  // Removed editId usage as it's not available in the current route
  const selectedSpace = null;

  // Don't render UpdateSpaceDialog if no space is selected
  const navigate = useNavigate();

  const spacesTree = useMemo(() => (spaces ? arrayToTree(spaces) : null), [spaces]);
  if (selectedSpace) {
    return null; // This will prevent the component from rendering the dialog
  }

  const getSpacePath = (spaceId: string, spaceNames: string[] = []) => {
    const space = spaces?.find((s) => s.id === spaceId);
    if (!space) return '';
    spaceNames.unshift(space.name);
    if (space.parentId) getSpacePath(space.parentId, spaceNames);
    return spaceNames;
  };

  const getTotalDocuments = (spaceId: string): number => {
    if (!spacesTree) return 0;
    const spaceNode = spacesTree.findNodeById(spaceId);
    if (!spaceNode) return 0;
    const spaceIds = new Set(spaceNode.toArray().map((space) => space.id));
    return documents.filter((doc) => (doc.spaceId ? spaceIds.has(doc.spaceId) : false)).length;
  };

  const handleUpdateClick = (space: Space) => {
    navigate({ to: '/spaces', search: { editId: space.id } });
  };

  const handleDeleteClick = (space: Space) => {
    alert({
      title: 'Delete Space',
      description: `Are you sure you want to delete the space "${space.name}" and all its contents? This action cannot be undone.`,
      cancelText: 'Cancel',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          const { error } = await deleteSpace(space.id);
          if (error) {
            toast.error(error.message || 'Failed to delete space');
          } else {
            toast.success('Space deleted successfully');
          }
        } catch {
          toast.error('Failed to delete space');
        }
      },
      buttonVariant: 'destructive',
    });
  };
  return (
    <div className="container p-4 py-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-2">
          <FolderIcon className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-bold">Your Spaces</h1>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            onClick={() =>
              createSpaceMutation.mutate({
                parentId: null,
                spaceId: null,
                clientId: crypto.randomUUID(),
              })
            }
            disabled={createSpaceMutation.isPending}
          >
            <PlusIcon className="mr-1 h-4 w-4" />
            {createSpaceMutation.isPending ? 'Creating...' : 'New Space'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(spaces ?? []).map((space) => {
          const path = getSpacePath(space.id);
          return (
            <Card
              key={space.id}
              className="overflow-hidden grid grid-rows-subgrid row-span-3 grid-cols-1 pb-0"
            >
              <CardHeader>
                <div className="flex items-center gap-2 truncate">
                  <DynamicIcon
                    name={space.icon || 'file'}
                    className="size-5 text-muted-foreground"
                  />
                  <CardTitle className="truncate" title={space.name}>
                    {space.name}
                  </CardTitle>
                </div>
                {/* description not available from listSpaces */}
              </CardHeader>
              <CardContent>
                {path && (
                  <p className="text-xs text-muted-foreground truncate">{path.join(' > ')}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {getTotalDocuments(space.id)} documents
                  {(spaces ?? []).some((s) => s.parentId === space.id) &&
                    ' (including child spaces)'}
                </p>
              </CardContent>
              <CardFooter className="flex justify-between p-2 bg-accent mt-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleUpdateClick({
                      id: space.id,
                      name: space.name,
                      createdAt: space.createdAt,
                      updatedAt: space.updatedAt,
                      icon: space.icon || 'file',
                      parentId: space.parentId,
                      handle: space.handle,
                    } as Space)
                  }
                >
                  <PencilIcon className="mr-1 h-4 w-4" />
                  Update
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleDeleteClick({
                      id: space.id,
                      name: space.name,
                      createdAt: space.createdAt,
                      updatedAt: space.updatedAt,
                      icon: space.icon || 'file',
                      parentId: space.parentId,
                      handle: space.handle,
                    } as Space)
                  }
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <TrashIcon className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* UpdateSpaceDialog removed since selectedSpace is null */}
    </div>
  );
}
