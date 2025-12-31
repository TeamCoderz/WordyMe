import { createFileRoute } from '@tanstack/react-router';
import z from 'zod';
import { RecentViewedDocsTopbar } from '../../../components/docs/RecentViewedDocsTopbar';
import { RecentViewedDocsTable } from '../../../components/docs/RecentViewedDocsTable';

const validateSearch = z.object({
  search: z.string().optional(),
  sort: z.enum(['a-z', 'z-a', 'newest', 'lastViewed']).optional(),
  page: z.number().optional(),
  days: z.number().optional(),
});

export const Route = createFileRoute('/_authed/docs/recent-viewed')({
  component: RouteComponent,
  validateSearch,
});

function RouteComponent() {
  return (
    <div className="min-h-[calc(100vh-var(--spacing)*14-1px)] flex flex-col pb-6">
      <RecentViewedDocsTopbar />
      <RecentViewedDocsTable />
    </div>
  );
}
