/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { EditDocument } from '@/components/documents/edit-document';
import SplashScreen from '@/components/splash-screen';
import { useActions, useSelector } from '@/store';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useEffect } from 'react';
import { DOCUMENTS_QUERY_KEYS } from '@/queries/query-keys';
import { useAllQueriesInvalidate } from '@/queries/utils';
import { useQuery } from '@tanstack/react-query';
import { getDocumentByHandleQueryOptions, getDocumentByIdQueryOptions } from '@/queries/documents';
import { getLocalRevisionByDocumentIdQueryOptions } from '@/queries/revisions';
import { EditDocumentLoading } from '@/components/documents/edit-document-loading';
import z from 'zod';

const searchParamsSchema = z.object({
  search: z.string().optional(),
  id: z.coerce.boolean().optional(),
});

export const Route = createFileRoute('/_authed/edit/$handle')({
  component: RouteComponent,
  beforeLoad: async ({ params, search, cause, context: { queryClient } }) => {
    const { handle } = params;
    if (search.id) {
      const document = await queryClient.ensureQueryData(
        getDocumentByIdQueryOptions(handle, queryClient),
      );
      if (cause !== 'preload') {
        throw redirect({
          to: '/edit/$handle',
          params: { handle: document.handle },
        });
      }
    }
  },
  loader: async ({ params, context: { queryClient } }) => {
    const { handle } = params;
    await queryClient.ensureQueryData(getDocumentByHandleQueryOptions(handle));
  },
  notFoundComponent: () => <SplashScreen className="absolute" title="Document not found" />,
  pendingComponent: () => <SplashScreen className="absolute" title="Loading Editor" />,
  validateSearch: searchParamsSchema,
});

function RouteComponent() {
  const { setActiveSpaceBySpaceId } = useActions();
  const user = useSelector((state) => state.user);
  const { handle } = Route.useParams();
  const { data: document, isSuccess } = useQuery(getDocumentByHandleQueryOptions(handle));
  const { data: revision, isLoading } = useQuery(
    getLocalRevisionByDocumentIdQueryOptions(
      document?.id,
      document?.currentRevisionId ?? null,
      isSuccess,
    ),
  );

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

  if (isLoading || !document || !user || !revision) {
    return <EditDocumentLoading handle={handle} />;
  }

  return <EditDocument user={user} document={document} initialState={revision.content} />;
}
