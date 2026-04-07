/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import SplashScreen from '@/components/splash-screen';
import { useActions, useSelector } from '@/store';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useEffect, lazy } from 'react';
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
const ViewDocument = lazy(() =>
  import('@/components/documents/view-document').then((m) => ({ default: m.ViewDocument })),
);
const ViewPDF = lazy(() =>
  import('@/components/documents/view-pdf').then((m) => ({ default: m.ViewPDF })),
);

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
  pendingComponent: () => <ViewDocumentLoading />,
  validateSearch: searchParamsSchema,
});

function RouteComponent() {
  const { setActiveSpaceBySpaceId } = useActions();
  const { splitPaneType, tabId } = Route.useRouteContext();
  const user = useSelector((state) => state.user);
  const { handle } = Route.useParams();
  const search = Route.useSearch();
  const { data: document, isSuccess } = useQuery(getDocumentByHandleQueryOptions(handle));
  const isPdf = document?.documentType === 'pdf';

  const { data: localRevision } = useQuery({
    ...getLocalRevisionByDocumentIdQueryOptions(
      document?.id,
      document?.currentRevisionId ?? null,
      isSuccess && !search.v && !isPdf,
    ),
  });
  const { data: cloudRevision, error: cloudRevisionError } = useQuery({
    ...getRevisionByIdQueryOptions(search.v ?? '', Boolean(search.v) && !isPdf),
  });
  const revision = search.v ? (cloudRevision ?? localRevision) : localRevision;
  const isLoadingNotes = !isPdf && !localRevision && !cloudRevision;
  const invalidate = useAllQueriesInvalidate();

  useEffect(() => {
    setActiveSpaceBySpaceId(document?.spaceId ?? '', splitPaneType);
    if (document) {
      invalidate([
        DOCUMENTS_QUERY_KEYS.RECENT_VIEWS,
        DOCUMENTS_QUERY_KEYS.FAVORITES,
        DOCUMENTS_QUERY_KEYS.HOME.BASE,
      ]);
    }
  }, [document]);

  if (cloudRevisionError && !isPdf) {
    return <SplashScreen className="absolute" title="Revision not found" />;
  }

  if (!document || !user) {
    return <ViewDocumentLoading />;
  }

  if (isPdf) {
    return <ViewPDF pdfUrl={document.pdfUrl} />;
  }

  if (isLoadingNotes || !revision) {
    return <ViewDocumentLoading />;
  }

  return (
    <ViewDocument
      userId={user.id}
      documentId={document.id}
      documentHandle={document.handle}
      tabId={tabId}
      initialState={revision.content}
    />
  );
}
