import { Document, Revision } from '@repo/types';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/avatar';
import { Button } from '@repo/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { Loader2, MoreVertical, Trash } from '@repo/ui/components/icons';
import { alert } from '@/components/Layout/alert';
import { toast } from 'sonner';
import { SetStateAction, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@repo/ui/components/dialog';
import { Input } from '@repo/ui/components/input';
import { useForm } from 'react-hook-form';
import z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/form';
import { getDocumentByHandleQueryOptions } from '@/queries/documents';
import { useQuery } from '@tanstack/react-query';
import {
  getRevisionByIdQueryOptions,
  getRevisionsByDocumentIdQueryOptions,
  useCreateRevisionMutation,
  useDeleteRevisionMutation,
  useSaveLocalRevisionMutation,
} from '@/queries/revisions';
import { useUpdateDocumentHeadMutation } from '@/queries/documents';
import { useUpdateRevisionNameMutation } from '@/queries/revisions';
import { generateText } from '@repo/editor/utils/generateText';
import { useComposerContext } from '@repo/editor/hooks/useComposerContext';
import { computeChecksum } from '@repo/editor/utils/computeChecksum';
import { serializeEditorState } from '@repo/editor/utils/editorState';
import {
  useSelector as useEditorSelector,
  useActions as useEditorActions,
} from '@repo/editor/store';

export function RevisionCard({ handle, revision }: { handle: string; revision: Revision }) {
  const { data: document } = useQuery(getDocumentByHandleQueryOptions(handle));

  const { data: revisions } = useQuery(getRevisionsByDocumentIdQueryOptions(revision.documentId));
  const { mutateAsync: createRevision } = useCreateRevisionMutation({
    docHandle: document?.handle ?? '',
    documentId: document?.id ?? '',
  });
  const { mutateAsync: updateDocumentData } = useUpdateDocumentHeadMutation({
    doc: document ?? null,
  });
  const { mutateAsync: deleteRevisionData } = useDeleteRevisionMutation({
    docHandle: document?.handle ?? '',
    documentId: document?.id ?? '',
  });

  const [editor] = useComposerContext();
  const checksum = useEditorSelector((state) => state.checksum);
  const isCloudRevision = !!revisions?.find((r) => r.id === revision.id);
  const hasLocalChanges = !revisions?.find((r) => r.checksum === checksum);
  const isLocalHead = revision.checksum === checksum;
  const isCloudHead = revision.id === document?.head;
  const { mutateAsync: saveLocalRevision } = useSaveLocalRevisionMutation({
    documentId: document?.id ?? '',
  });
  const { updateEditorStoreState } = useEditorActions();

  const saveLocalChanges = async (makeCurrentRevision: boolean) => {
    if (!hasLocalChanges) return;
    const editorState = editor.getEditorState();
    const serializedEditorState = serializeEditorState(editorState);
    const data = JSON.stringify(serializedEditorState);
    const text = generateText(serializedEditorState);
    const checksum = computeChecksum(serializedEditorState);
    await createRevision({
      documentId: revision.documentId,
      content: data,
      text: text,
      checksum: checksum,
      makeCurrentRevision,
    });
  };

  const viewRevision = async () => {
    if (hasLocalChanges) {
      await alert({
        title: 'Save Local Changes',
        description: 'You have unsaved changes. Do you want to save them?',
        cancelText: 'Discard',
        confirmText: 'Save',
        onConfirm: async () => {
          await saveLocalChanges(false);
        },
      });
    }
    const toastId = toast.loading('Loading revision');
    try {
      const cloudRevision = await getRevisionByIdQueryOptions(revision.id, true).queryFn();
      const serializedData = cloudRevision.data;
      const editorState = editor.parseEditorState(serializedData);
      editor.update(
        () => {
          editor.setEditorState(editorState);
        },
        { discrete: true, tag: 'revision' },
      );
      updateEditorStoreState('checksum', cloudRevision.checksum);
      toast.success('Revision loaded successfully', {
        id: toastId,
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load revision', {
        id: toastId,
      });
    }
  };
  const restoreRevision = async () => {
    if (hasLocalChanges) {
      await alert({
        title: 'Save Local Changes',
        description: 'You have unsaved changes. Do you want to save them?',
        cancelText: 'Discard',
        confirmText: 'Save',
        onConfirm: async () => {
          await saveLocalChanges(false);
        },
      });
    }
    const toastId = toast.loading('Restoring revision');
    try {
      if (!document) throw new Error('Document not found');
      if (!isCloudHead) {
        await updateDocumentData({
          id: revision.documentId,
          head: revision.id,
        });
      }
      const cloudRevision = await getRevisionByIdQueryOptions(revision.id, true).queryFn();
      const serializedData = cloudRevision.data;
      const editorState = editor.parseEditorState(serializedData);
      editor.update(
        () => {
          editor.setEditorState(editorState);
        },
        { discrete: true, tag: 'revision' },
      );
      updateEditorStoreState('checksum', cloudRevision.checksum);
      await saveLocalRevision({ editorState });
      toast.success('Revision restored successfully', {
        id: toastId,
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to restore revision', {
        id: toastId,
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleDelete = async () => {
    alert({
      title: 'Delete Revision',
      description: `Are you sure you want to delete the revision ${
        revision.name ??
        new Date(revision.createdAt).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      }? This action cannot be undone.`,
      cancelText: 'Cancel',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await deleteRevisionData(revision.id);
        } catch {
          toast('Error deleting revision', {
            description: 'An error occurred while deleting the revision.',
          });
        }
      },
      buttonVariant: 'destructive',
    });
  };

  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);

  return (
    <Card className="relative py-4 gap-0">
      <CardHeader className="px-4">
        <CardTitle className="flex items-center gap-2 w-full truncate">
          <Avatar>
            <AvatarImage src={revision.author.image ?? undefined} />
            <AvatarFallback>{revision.author.name?.charAt(0) ?? '?'}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1 w-full truncate">
            <span
              className="text-sm font-medium pr-6 truncate"
              title={new Date(revision.createdAt).toISOString()}
            >
              {revision.name ??
                new Date(revision.createdAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
            </span>
            <span className="text-xs text-muted-foreground truncate">{revision.author.name}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex gap-2 w-full mt-2">
          {isCloudRevision ? (
            <>
              <Button
                variant="outline"
                onClick={viewRevision}
                disabled={isLocalHead && !hasLocalChanges}
              >
                View
              </Button>
              <Button
                variant="outline"
                disabled={isCloudHead && !hasLocalChanges}
                onClick={restoreRevision}
              >
                Restore
              </Button>
              <Button
                className="ml-auto"
                variant="destructive"
                size="icon"
                disabled={isCloudHead}
                onClick={handleDelete}
              >
                <Trash />
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => saveLocalChanges(true)}>
              Save
            </Button>
          )}
        </div>
      </CardContent>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 rounded-full">
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem asChild>
            <Button
              className="w-full justify-start"
              variant="ghost"
              onClick={() => setIsRenameDialogOpen(true)}
            >
              Rename
            </Button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RevisionRenameDialog
        open={isRenameDialogOpen}
        setOpen={setIsRenameDialogOpen}
        revision={revision}
        document={document ?? null}
      />
    </Card>
  );
}

const changeRevisionNameSchema = z.object({
  name: z.string(),
});
type ChangeRevisionNameType = z.infer<typeof changeRevisionNameSchema>;

function RevisionRenameDialog({
  open,
  setOpen,
  revision,
  document,
}: {
  open: boolean;
  setOpen: React.Dispatch<SetStateAction<boolean>>;
  revision: Revision;
  document: Document | null;
}) {
  const { mutate: updateRevisionName } = useUpdateRevisionNameMutation({
    document: document ?? null,
    revisionId: revision.id,
  });
  // const queryClient = useQueryClient();
  const form = useForm<ChangeRevisionNameType>({
    defaultValues: { name: revision.name || '' },
    resolver: zodResolver(changeRevisionNameSchema),
  });
  const {
    handleSubmit,
    formState: { isSubmitting },
    reset,
  } = form;

  useEffect(() => {
    if (open) {
      reset({ name: revision.name || '' });
    }
  }, [open, revision.name, reset]);

  const onSubmit = async (data: ChangeRevisionNameType) => {
    try {
      updateRevisionName({
        name: data.name,
      });
      setOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('An error occurred while renaming the revision.');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename Revision</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span>Saving...</span>
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
