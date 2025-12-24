import { createFileRoute } from '@tanstack/react-router';
import z from 'zod';
import { FavoriteSpacesTopbar } from '../../../components/spaces/FavoriteSpacesTopbar';
import { FavoriteSpacesTable } from '../../../components/spaces/FavoriteSpacesTable';
const validateSearch = z.object({
  search: z.string().optional(),
  sort: z.enum(['a-z', 'z-a', 'newest', 'lastViewed']).optional(),
  page: z.number().optional(),
});
export const Route = createFileRoute('/_authed/spaces/favorites')({
  component: FavoriteSpacesPage,
  validateSearch,
});

function FavoriteSpacesPage() {
  return (
    <div className="min-h-[calc(100vh-var(--spacing)*14-1px)] flex flex-col pb-6">
      <FavoriteSpacesTopbar />
      <FavoriteSpacesTable />
    </div>
  );
}
