import { useNavigate, useSearch } from '@tanstack/react-router';

import { ArrowDown } from '@repo/ui/components/icons';

import { Select, SelectContent, SelectItem, SelectTrigger } from '@repo/ui/components/select';
import { Button } from '@repo/ui/components/button';
import { cn } from '@repo/ui/lib/utils';
interface TableSortProps {
  options: {
    label: string;
    value: string;
  }[];
  from: '/_authed/settings/users' | '/_authed/settings/roles';
  to: '/settings/users' | '/settings/roles';
}
function TableSort({ options, from, to }: TableSortProps) {
  // @ts-expect-error - Route is not defined
  const searchParams = useSearch({ from });

  const currentSort =
    // @ts-expect-error - Route is not defined
    options.find((option) => option.value === searchParams.sort) ??
    options.find((option) => option.value === 'index');
  const navigate = useNavigate();
  const sortChange = (value: string) => {
    // @ts-expect-error - Route is not defined
    navigate({ to, search: { ...searchParams, sort: value } });
  };
  const toggleOrder = () => {
    navigate({
      // @ts-expect-error - Route is not defined
      to,
      search: {
        // @ts-expect-error - Route is not defined
        ...searchParams,
        // @ts-expect-error - Route is not defined
        order: searchParams.order === 'desc' ? undefined : 'desc',
      },
    });
  };
  return (
    <div className="flex gap-0.5 rounded-md border border-input overflow-hidden">
      <Select
        // @ts-expect-error - Route is not defined
        value={searchParams.sort || 'index'}
        onValueChange={sortChange}
      >
        <SelectTrigger className="rounded-none [&>svg]:hidden focus-visible:ring-0 focus-visible:border-none border-none">
          {currentSort?.label}
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon"
        className="rounded-none !border-none group"
        onClick={toggleOrder}
      >
        <ArrowDown
          className={cn('transition-all duration-300 group-hover:rotate-180', {
            // @ts-expect-error - Route is not defined
            'rotate-0 group-hover:rotate-180': searchParams.order === 'asc',
            // @ts-expect-error - Route is not defined
            'rotate-180 group-hover:rotate-0': searchParams.order === 'desc',
          })}
        />
      </Button>
    </div>
  );
}

export default TableSort;
