/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { createFileRoute } from '@tanstack/react-router';
import z from 'zod';
import { FavoriteDocsTopbar } from '../../../components/docs/FavoriteDocsTopbar';
import { FavoriteDocsTable } from '../../../components/docs/FavoriteDocsTable';

const validateSearch = z.object({
  search: z.string().optional(),
  sort: z.enum(['a-z', 'z-a', 'newest', 'lastViewed']).optional(),
  page: z.number().optional(),
});

export const Route = createFileRoute('/_authed/docs/favorites')({
  component: RouteComponent,
  validateSearch,
});

function RouteComponent() {
  return (
    <div className="min-h-[calc(100vh-var(--spacing)*14-1px)] flex flex-col pb-6">
      <FavoriteDocsTopbar />
      <FavoriteDocsTable />
    </div>
  );
}
