import { ViewDocument } from '@/components/documents/view-document';
import SplashScreen from '@/components/splash-screen';
import { useActions, useSelector } from '@/store';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDocumentByHandleQueryOptions } from '@/queries/documents';
import { DOCUMENTS_QUERY_KEYS } from '@/queries/query-keys';
import { useAllQueriesInvalidate } from '@/queries/utils';
import { getLocalRevisionByDocumentIdQueryOptions } from '@/queries/revisions';
import { ViewDocumentLoading } from '@/components/documents/view-document-loading';

export const Route = createFileRoute('/_authed/view/$handle')({
  component: RouteComponent,
  notFoundComponent: () => <SplashScreen className="absolute" title="Document not found" />,
  pendingComponent: () => <SplashScreen className="absolute" title="Loading Document" />,
});

function RouteComponent() {
  const { setActiveDocument, setActiveSpaceBySpaceId } = useActions();
  const user = useSelector((state) => state.user);
  const { handle } = Route.useParams();
  const { data: document, isSuccess } = useQuery(getDocumentByHandleQueryOptions(handle));
  const { data: revision, isLoading } = useQuery(
    getLocalRevisionByDocumentIdQueryOptions(document?.id, document?.head, isSuccess),
  );
  const invalidate = useAllQueriesInvalidate();

  useEffect(() => {
    setActiveDocument(document ?? null);
    setActiveSpaceBySpaceId(document?.spaceId ?? '');
    if (document) {
      invalidate([
        DOCUMENTS_QUERY_KEYS.RECENT_VIEWS,
        DOCUMENTS_QUERY_KEYS.FAVORITES,
        DOCUMENTS_QUERY_KEYS.HOME.BASE,
      ]);
    }
    return () => {
      setActiveDocument(null);
    };
  }, [document]);

  if (isLoading || !document || !user || !revision) {
    return <ViewDocumentLoading handle={handle} />;
  }

  const initialState = revision && 'data' in revision ? JSON.stringify(revision.data) : undefined;

  return <ViewDocument user={user} document={document} initialState={initialState} />;
}
