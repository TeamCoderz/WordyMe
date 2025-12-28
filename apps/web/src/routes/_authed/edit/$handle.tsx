import { EditDocument } from '@/components/documents/edit-document';
import SplashScreen from '@/components/splash-screen';
import { useActions, useSelector } from '@/store';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { DOCUMENTS_QUERY_KEYS } from '@/queries/query-keys';
import { useAllQueriesInvalidate } from '@/queries/utils';
import { useQuery } from '@tanstack/react-query';
import { getDocumentByHandleQueryOptions } from '@/queries/documents';
import { getLocalRevisionByDocumentIdQueryOptions } from '@/queries/revisions';
import { EditDocumentLoading } from '@/components/documents/edit-document-loading';

export const Route = createFileRoute('/_authed/edit/$handle')({
  component: RouteComponent,

  notFoundComponent: () => <SplashScreen className="absolute" title="Document not found" />,
  pendingComponent: () => <SplashScreen className="absolute" title="Loading Editor" />,
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
    return <EditDocumentLoading handle={handle} />;
  }

  const initialState = 'data' in revision ? JSON.stringify(revision.data) : undefined;

  return (
    <EditDocument
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.avatar_image?.calculatedImage,
        handle: user.handle,
      }}
      document={document}
      initialState={initialState}
    />
  );
}
