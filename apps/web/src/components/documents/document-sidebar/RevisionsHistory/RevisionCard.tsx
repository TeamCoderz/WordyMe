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
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { useLocation, useNavigate } from '@tanstack/react-router';
import { cn } from '@repo/ui/lib/utils';
import { getLocalRevisionByDocumentIdQueryOptions } from '@/queries/revisions';

const formatRevisionLabel = (revision: Revision) => {
  return (
    revision.revision_name ??
    new Date(revision.created_at).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  );
};

export function RevisionCard({ handle, revision }: { handle: string; revision: Revision }) {
  const queryClient = useQueryClient();
  const { data: document } = useQuery(getDocumentByHandleQueryOptions(handle));

  const { data: revisions } = useQuery(getRevisionsByDocumentIdQueryOptions(revision.document_id));
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
  const isCloudHead = revision.id === document?.currentRevisionId;
  const [viewStatus, setViewStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  );
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  );
  const { mutateAsync: saveLocalRevision } = useSaveLocalRevisionMutation({
    documentId: document?.id ?? '',
  });
  const { updateEditorStoreState } = useEditorActions();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const saveLocalChanges = async (makeCurrentRevision: boolean) => {
    if (!hasLocalChanges) return;
    const editorState = editor.getEditorState();
    const serializedEditorState = serializeEditorState(editorState);
    const data = JSON.stringify(serializedEditorState);
    const text = generateText(serializedEditorState);
    const checksum = computeChecksum(serializedEditorState);
    await createRevision({
      documentId: revision.document_id,
      content: data,
      text: text,
      checksum: checksum,
      makeCurrentRevision,
    });
  };

  const viewRevision = async () => {
    setViewStatus('loading');
    if (pathname.startsWith('/view/')) {
      try {
        await queryClient.ensureQueryData(getRevisionByIdQueryOptions(revision.id, true));
        setViewStatus('success');
        setTimeout(() => {
          navigate({
            to: '/view/$handle',
            params: { handle },
            search: (prev) => ({
              ...prev,
              v: revision.id,
            }),
          });
        }, 300);
      } catch (error) {
        console.error(error);
        setViewStatus('error');
      } finally {
        setTimeout(() => setViewStatus('idle'), 300);
      }
      return;
    }
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
    try {
      const cloudRevision = await queryClient.ensureQueryData(
        getRevisionByIdQueryOptions(revision.id, true),
      );
      const serializedData =
        cloudRevision && 'content' in cloudRevision ? JSON.parse(cloudRevision.content) : null;
      const editorState = editor.parseEditorState(serializedData);
      editor.update(
        () => {
          editor.setEditorState(editorState);
        },
        { discrete: true, tag: 'revision' },
      );
      updateEditorStoreState('checksum', cloudRevision.checksum);
      // Dispatch custom event with checksum
      const event = new CustomEvent('checksum-change', {
        detail: { checksum: cloudRevision.checksum },
      });
      window.dispatchEvent(event);
      setViewStatus('success');
    } catch (error) {
      console.error(error);
      setViewStatus('error');
    } finally {
      setTimeout(() => setViewStatus('idle'), 300);
    }
  };
  const restoreRevision = async () => {
    setRestoreStatus('loading');
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
    try {
      if (!document) throw new Error('Document not found');
      if (!isCloudHead) {
        await updateDocumentData({
          id: revision.document_id,
          head: revision.id,
        });
      }
      const cloudRevision = await queryClient.ensureQueryData(
        getRevisionByIdQueryOptions(revision.id, true),
      );
      const serializedData =
        cloudRevision && 'content' in cloudRevision ? JSON.parse(cloudRevision.content) : null;
      const editorState = editor.parseEditorState(serializedData);
      editor.update(
        () => {
          editor.setEditorState(editorState);
        },
        { discrete: true, tag: 'revision' },
      );
      updateEditorStoreState('checksum', cloudRevision.checksum);
      // Dispatch custom event with checksum
      const event = new CustomEvent('checksum-change', {
        detail: { checksum: cloudRevision.checksum },
      });
      window.dispatchEvent(event);
      await saveLocalRevision({ serializedEditorState: serializedData });
      if (pathname.startsWith('/view/')) {
        queryClient.setQueryData(
          getLocalRevisionByDocumentIdQueryOptions(document?.id ?? '').queryKey,
          { data: JSON.parse(cloudRevision.content) },
        );
        navigate({
          to: '/view/$handle',
          params: { handle },
          search: (prev) => ({
            ...prev,
            v: undefined,
          }),
        });
      }
    } catch (error) {
      console.error(error);
      setRestoreStatus('error');
    } finally {
      setTimeout(() => setRestoreStatus('idle'), 300);
    }
  };

  const handleDelete = async () => {
    setDeleteStatus('loading');
    alert({
      title: 'Delete Revision',
      description: `Are you sure you want to delete the revision ${formatRevisionLabel(
        revision,
      )}? This action cannot be undone.`,
      cancelText: 'Cancel',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await deleteRevisionData(revision.id);
          setDeleteStatus('success');
        } catch {
          setDeleteStatus('error');
        } finally {
          setTimeout(() => setDeleteStatus('idle'), 300);
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
            <span className="text-sm font-medium pr-6 truncate" title={revision.created_at}>
              {formatRevisionLabel(revision)}
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
                disabled={(isLocalHead && !hasLocalChanges) || viewStatus !== 'idle'}
                className={cn('transition-colors', {
                  'ring ring-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]':
                    viewStatus === 'loading',
                  'ring ring-green-400 shadow-[0_0_10px_rgba(34,197,94,0.8)]':
                    viewStatus === 'success',
                  'ring ring-red-400 shadow-[0_0_10px_rgba(239,68,68,0.8)]': viewStatus === 'error',
                })}
              >
                View
              </Button>
              <Button
                variant="outline"
                disabled={(isCloudHead && !hasLocalChanges) || restoreStatus !== 'idle'}
                onClick={restoreRevision}
                className={cn('transition-colors', {
                  'ring ring-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]':
                    restoreStatus === 'loading',
                  'ring ring-green-400 shadow-[0_0_10px_rgba(34,197,94,0.8)]':
                    restoreStatus === 'success',
                  'ring ring-red-400 shadow-[0_0_10px_rgba(239,68,68,0.8)]':
                    restoreStatus === 'error',
                })}
              >
                Restore
              </Button>
              <Button
                className={cn('ml-auto transition-colors', {
                  'ring ring-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]':
                    deleteStatus === 'loading',
                  'ring ring-green-400 shadow-[0_0_10px_rgba(34,197,94,0.8)]':
                    deleteStatus === 'success',
                  'ring ring-red-400 shadow-[0_0_10px_rgba(239,68,68,0.8)]':
                    deleteStatus === 'error',
                })}
                variant="destructive"
                size="icon"
                disabled={isCloudHead || deleteStatus !== 'idle'}
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
        <DropdownMenuContent onCloseAutoFocus={(e) => e.preventDefault()}>
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
    defaultValues: { name: revision.revision_name || '' },
    resolver: zodResolver(changeRevisionNameSchema),
  });
  const {
    handleSubmit,
    formState: { isSubmitting },
    reset,
  } = form;

  useEffect(() => {
    if (open) {
      reset({ name: revision.revision_name || '' });
    }
  }, [open, revision.revision_name, reset]);

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
