/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { createFileRoute } from '@tanstack/react-router';
import z from 'zod';
import { RecentViewedDocsTopbar } from '../../../components/docs/RecentViewedDocsTopbar';
import { RecentViewedDocsTable } from '../../../components/docs/RecentViewedDocsTable';

const validateSearch = z.object({
  search: z.string().optional().catch(''),
  sort: z.enum(['a-z', 'z-a', 'newest', 'lastViewed']).optional(),
  page: z.coerce.number().min(1).default(1).catch(1),
  days: z.coerce.number().min(1).default(14).catch(14),
});

export const Route = createFileRoute('/_authed/docs/recent-viewed')({
  component: RouteComponent,
  validateSearch,
});

function RouteComponent() {
  return (
    <div className="flex flex-col h-full pb-6">
      <RecentViewedDocsTopbar />
      <RecentViewedDocsTable />
    </div>
  );
}
