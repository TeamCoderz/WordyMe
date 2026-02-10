import { ViewDocument } from '@/components/documents/view-document';
import SplashScreen from '@/components/splash-screen';
import { useActions, useSelector } from '@/store';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDocumentByHandleQueryOptions, getDocumentByIdQueryOptions } from '@/queries/documents';
import { DOCUMENTS_QUERY_KEYS } from '@/queries/query-keys';
import { useAllQueriesInvalidate } from '@/queries/utils';
import {
  getLocalRevisionByDocumentIdQueryOptions,
  getRevisionByIdQueryOptions,
} from '@/queries/revisions';
import { ViewDocumentLoading } from '@/components/documents/view-document-loading';
import z from 'zod';

const searchParamsSchema = z.object({
  search: z.string().optional(),
  id: z.coerce.boolean().optional(),
  v: z.string().optional(),
});

export const Route = createFileRoute('/_authed/view/$handle')({
  component: RouteComponent,
  beforeLoad: async ({ params, search, cause, context: { queryClient } }) => {
    const { handle } = params;
    if (search.id) {
      const document = await queryClient.ensureQueryData(
        getDocumentByIdQueryOptions(handle, queryClient),
      );
      if (cause !== 'preload') {
        const hash = window.location.hash.slice(1);
        throw redirect({
          to: '/view/$handle',
          params: { handle: document.handle },
          search: { ...search, id: undefined },
          hash,
        });
      }
    }
  },
  loader: async ({ params, context: { queryClient } }) => {
    const { handle } = params;
    await queryClient.ensureQueryData(getDocumentByHandleQueryOptions(handle));
  },
  notFoundComponent: () => <SplashScreen className="absolute" title="Document not found" />,
  pendingComponent: () => <SplashScreen className="absolute" title="Loading Document" />,
  validateSearch: searchParamsSchema,
});

function RouteComponent() {
  const { setActiveSpaceBySpaceId } = useActions();
  const user = useSelector((state) => state.user);
  const { handle } = Route.useParams();
  const search = Route.useSearch();
  const { data: document, isSuccess } = useQuery(getDocumentByHandleQueryOptions(handle));
  const { data: localRevision } = useQuery(
    getLocalRevisionByDocumentIdQueryOptions(
      document?.id,
      document?.currentRevisionId ?? null,
      isSuccess && !search.v,
    ),
  );
  const { data: cloudRevision, error: cloudRevisionError } = useQuery(
    getRevisionByIdQueryOptions(search.v ?? '', Boolean(search.v)),
  );
  const revision = search.v ? (cloudRevision ?? localRevision) : localRevision;
  const isLoading = !localRevision && !cloudRevision;
  const invalidate = useAllQueriesInvalidate();

  useEffect(() => {
    setActiveSpaceBySpaceId(document?.spaceId ?? '');
    if (document) {
      invalidate([
        DOCUMENTS_QUERY_KEYS.RECENT_VIEWS,
        DOCUMENTS_QUERY_KEYS.FAVORITES,
        DOCUMENTS_QUERY_KEYS.HOME.BASE,
      ]);
    }
  }, [document]);

  if (cloudRevisionError) {
    return <SplashScreen className="absolute" title="Revision not found" />;
  }

  if (isLoading || !document || !user || !revision) {
    return <ViewDocumentLoading handle={handle} />;
  }

  return (
    <ViewDocument
      userId={user.id}
      documentId={document.id}
      documentHandle={document.handle}
      revisionId={search.v ? cloudRevision?.id : undefined}
      initialState={revision.content}
    />
  );
}
