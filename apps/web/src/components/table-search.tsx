import { useEffect, useRef } from 'react';
import { Input } from '@repo/ui/components/input';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useDebouncedCallback } from 'use-debounce';
import { X } from '@repo/ui/components/icons';

import { Link } from '@tanstack/react-router';
interface TableSearchProps {
  from: '/_authed/settings/users' | '/_authed/settings/roles';
  to: '/settings/users' | '/settings/roles';
}
function TableSearch({ from, to }: TableSearchProps) {
  // @ts-expect-error - Route is not defined
  const searchParams = useSearch({ from });
  const inputRef = useRef<HTMLInputElement | null>(null);

  const navigate = useNavigate();

  const search = useDebouncedCallback((value: string) => {
    navigate({
      // @ts-expect-error - Route is not defined
      to,
      search: {
        // @ts-expect-error - Route is not defined
        ...searchParams,
        search: value ? value : undefined,
        page: undefined,
      },
    });
  }, 800);

  useEffect(() => {
    // @ts-expect-error - Route is not defined
    if (inputRef.current && !searchParams.search) inputRef.current.value = '';
    // @ts-expect-error - Route is not defined
  }, [searchParams.search]);
  return (
    <div className="w-fit flex flex-col relative max-w-52">
      <Input
        placeholder="Search"
        ref={inputRef}
        // @ts-expect-error - Route is not defined
        defaultValue={searchParams.search || undefined}
        onChange={(e) => search(e.target.value)}
      />
      {/* @ts-expect-error - Route is not defined */}
      {searchParams.search && (
        <Link
          className="absolute top-1/2 -translate-y-1/2 self-end -translate-x-2 text-gray-400 hover:text-destructive"
          tabIndex={-1}
          // @ts-expect-error - Route is not defined
          to={to}
          // @ts-expect-error - Route is not defined
          search={{ ...searchParams, search: undefined, page: undefined }}
        >
          <X />
        </Link>
      )}
    </div>
  );
}

export default TableSearch;
