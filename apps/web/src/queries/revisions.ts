import {
  // getRevisionsByDocumentId,
  // createNewRevision,
  // deleteRevisionById,
  // getRevisionWithContent,
  updateRevisionName,
  createRevision,
  deleteRevision,
  getRevisionById,
  getRevisionsByDocumentId,
} from '@repo/sdk/revisions.ts';
import { updateDocument } from '@repo/sdk/documents.ts';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAllQueriesInvalidate } from './utils';
import { getDocumentByHandleQueryOptions } from './documents';
import type { Document } from '@repo/types';
import type { EditorState } from '@repo/editor/types';
import { getLocalDocument, saveLocalDocument } from '@repo/editor/indexeddb';
import { serializeEditorState } from '@repo/editor/utils/editorState';

export const getRevisionsByDocumentIdQueryOptions = (documentId: string) => {
  return {
    queryKey: ['revisions', documentId],
    queryFn: async () => {
      if (!documentId) return [];
      const { data, error } = await getRevisionsByDocumentId(documentId);
      if (error) throw error;

      return data;
    },
  };
};

export function useCreateRevisionMutation({
  docHandle,
  documentId,
}: {
  docHandle: string;
  documentId: string;
}) {
  const invalidate = useAllQueriesInvalidate();
  return useMutation({
    mutationKey: ['createRevision'],
    mutationFn: async (revision: {
      content: string;
      documentId: string;
      text: string;
      checksum: string;
      revision_name?: string;
      makeCurrentRevision?: boolean;
    }) => {
      const { data, error } = await createRevision({
        content: revision.content,
        documentId: revision.documentId,
        text: revision.text,
        revisionName: revision.revision_name,
        checksum: revision.checksum,
        makeCurrentRevision: revision.makeCurrentRevision ?? true,
      });
      if (error) throw error;
      return data;
    },
    onMutate() {
      return toast.loading('Saving revision');
    },
    onSuccess: (_, __, toastId) => {
      toast.success('Revision saved successfully', {
        id: toastId,
      });
      invalidate([
        getRevisionsByDocumentIdQueryOptions(documentId).queryKey,
        getDocumentByHandleQueryOptions(docHandle).queryKey,
      ]);
    },
    onError: (error, __, toastId) => {
      toast.error(error.message || 'Failed to save revision', {
        id: toastId,
      });
    },
  });
}

export function useDeleteRevisionMutation({
  docHandle,
  documentId,
}: {
  docHandle: string;
  documentId: string;
}) {
  const invalidate = useAllQueriesInvalidate();
  return useMutation({
    mutationKey: ['deleteRevision'],
    mutationFn: async (revisionId: string) => {
      const { error } = await deleteRevision(revisionId);
      if (error) throw error;
      return;
    },
    onMutate() {
      return toast.loading('Deleting revision...');
    },
    onSuccess: (_, __, toastId) => {
      toast.success('Revision deleted', {
        id: toastId ?? undefined,
      });
      invalidate([
        getRevisionsByDocumentIdQueryOptions(documentId).queryKey,
        getDocumentByHandleQueryOptions(docHandle).queryKey,
      ]);
    },
    onError: (error, __, toastId) => {
      toast.error(error.message || 'Error deleting revision', {
        id: toastId ?? undefined,
      });
    },
  });
}

export function useUpdateRevisionNameMutation({
  document,
  revisionId,
}: {
  document: Document | null;
  revisionId: string;
}) {
  const invalidate = useAllQueriesInvalidate();
  return useMutation({
    mutationKey: ['updateRevisionName', document?.id, revisionId],
    mutationFn: async ({ name }: { name: string }) => {
      const { data, error } = await updateRevisionName(revisionId, {
        revisionName: name,
      });
      if (error) throw error;
      return data;
    },
    onMutate() {
      return toast.loading('Renaming revision...');
    },
    onSuccess: (_, __, toastId) => {
      toast.success('Revision renamed', {
        id: toastId ?? undefined,
      });
      invalidate([getRevisionsByDocumentIdQueryOptions(document?.id ?? '').queryKey]);
      if (document?.head === revisionId) {
        invalidate([
          getDocumentByHandleQueryOptions(document?.handle ?? '').queryKey,
          getLocalRevisionByDocumentIdQueryOptions(document?.id, document?.head, true)
            .queryKey as string[],
        ]);
      }
    },
    onError: (error: any, __, toastId) => {
      toast.error(error?.message || 'Error renaming revision', {
        id: toastId ?? undefined,
      });
    },
  });
}

export function useSaveDocumentMutation({
  documentId,
  documentHandle,
}: {
  documentId: string;
  documentHandle: string;
}) {
  const invalidate = useAllQueriesInvalidate();
  return useMutation({
    mutationKey: ['updateDocument', documentId],
    mutationFn: async ({
      document,
      editorState,
      checksum,
      revisionName,
      keepPreviousRevision,
      isAutosave: _ = false,
    }: {
      document: Document;
      editorState: EditorState;
      checksum: string;
      revisionName?: string;
      keepPreviousRevision: boolean | undefined;
      isAutosave?: boolean;
    }) => {
      if (!document) {
        throw new Error('Could not find a document');
      }
      const serializedEditorState = serializeEditorState(editorState);
      const generateText = await import('@repo/editor/utils/generateText').then(
        (module) => module.generateText,
      );
      const text = generateText(serializedEditorState);
      const { data: newRevision, error: revisionError } = await createRevision({
        documentId: document.id,
        content: JSON.stringify(serializedEditorState),
        text,
        revisionName: revisionName,
        checksum: checksum,
      });
      if (revisionError || !newRevision) {
        throw new Error(revisionError?.message || 'Failed to create revision');
      }
      const { error: updateError } = await updateDocument(document.id, {
        currentRevisionId: newRevision.id,
      });
      if (updateError) {
        throw new Error(updateError.message || 'Failed to update document head');
      }
      if (!keepPreviousRevision) {
        const { error: deleteError } = await deleteRevision(document.head ?? '');
        if (deleteError) {
          throw new Error(deleteError.message || 'Failed to delete previous revision');
        }
      }

      return true;
    },
    onMutate({ isAutosave }) {
      const toastId = isAutosave ? undefined : toast.loading('Saving document...');
      return toastId;
    },
    onSuccess: (_, __, toastId) => {
      if (toastId) {
        toast.success('Document saved', {
          id: toastId,
        });
      }
      invalidate([
        getRevisionsByDocumentIdQueryOptions(documentId).queryKey,
        getDocumentByHandleQueryOptions(documentHandle).queryKey,
      ]);
    },
    onError: (error, __, toastId) => {
      if (toastId) {
        toast.error(error.message || 'Failed to save document', {
          id: toastId,
        });
      }
    },
  });
}

export function getRevisionByIdQueryOptions(revisionId: string, enabled: boolean) {
  return {
    queryKey: ['revision', revisionId],
    queryFn: async () => {
      const { data: revision, error: revisionError } = await getRevisionById(revisionId);
      if (revisionError) throw revisionError;
      return revision;
    },
    enabled,
  };
}

export function getLocalRevisionByDocumentIdQueryOptions(
  documentId?: string,
  head?: string | null,
  enabled?: boolean,
) {
  return {
    queryKey: ['localDocumentRevision', documentId!],
    queryFn: async () => {
      if (!documentId || !head) return null;
      try {
        const localDocument = await getLocalDocument(documentId);
        if (!localDocument) throw new Error('No local document found');
        return {
          data: localDocument,
        };
      } catch (error) {
        const revision = await getRevisionByIdQueryOptions(head, true).queryFn();

        await saveLocalDocument(documentId, JSON.parse(revision.content));
        return revision;
      }
    },
    enabled,
  };
}

export function useSaveLocalRevisionMutation({ documentId }: { documentId: string }) {
  const invalidate = useAllQueriesInvalidate();
  return useMutation({
    mutationKey: ['saveLocalDocumentRevision', documentId],
    mutationFn: async ({ editorState }: { editorState: EditorState }) => {
      const serializedEditorState = serializeEditorState(editorState);
      await saveLocalDocument(documentId, serializedEditorState);
      return true;
    },
    onSuccess: () => {
      invalidate([getLocalRevisionByDocumentIdQueryOptions(documentId).queryKey]);
    },
  });
}
