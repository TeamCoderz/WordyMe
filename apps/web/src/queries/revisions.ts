import {
  getRevisionsByDocumentId,
  createNewRevision,
  deleteRevisionById,
  getRevisionWithContent,
  updateRevisionName,
} from '@repo/backend/sdk/revisions.js';
import { updateDocument } from '@repo/backend/sdk/documents.js';
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
      const { data, error } = await createNewRevision({
        content: revision.content,
        documentId: revision.documentId,
        text: revision.text,
        revision_name: revision.revision_name,
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
      const { data, error } = await deleteRevisionById(revisionId);
      if (error) throw error;
      return data;
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
        revision_name: name,
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
      const { data: newRevision, error: revisionError } = await createNewRevision({
        documentId: document.id,
        content: JSON.stringify(serializedEditorState),
        text,
        revision_name: revisionName,
        checksum: checksum,
      });
      if (revisionError || !newRevision) {
        throw new Error(revisionError?.message || 'Failed to create revision');
      }
      const { error: updateError } = await updateDocument(document.id, {
        current_revision_id: newRevision.id,
      });
      if (updateError) {
        throw new Error(updateError.message || 'Failed to update document head');
      }
      if (!keepPreviousRevision) {
        const { error: deleteError } = await deleteRevisionById(document.head ?? '');
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
      const { data: revision, error: revisionError } = await getRevisionWithContent(revisionId);
      if (!revision || !('data' in revision) || revisionError) {
        throw new Error('No revision found');
      }
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

        await saveLocalDocument(documentId, revision.data);
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
