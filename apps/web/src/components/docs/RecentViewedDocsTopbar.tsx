/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { ListFilter, Search } from '@repo/ui/components/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import { Route } from '@/routes/_authed/docs/recent-viewed';
import { useDebouncedCallback } from 'use-debounce';
import { useNavigate } from '@tanstack/react-router';

export function RecentViewedDocsTopbar() {
  const navigate = useNavigate();
  const searchParams = Route.useSearch();
  const searchTerm = searchParams.search ?? '';
  const sort = searchParams.sort ?? 'lastViewed';
  const days = searchParams.days ?? 14;
  const onSearch = useDebouncedCallback((value: string) => {
    navigate({
      to: '.',
      search: { ...searchParams, search: value.trim() || undefined },
    });
  }, 800);

  return (
    <div className="px-4 min-h-14 border-b-1 flex items-center justify-between flex-wrap gap-2 p-2">
      <h2 className="lg:text-lg md:text-base text-sm  font-bold truncate">
        Recently Viewed Documents
      </h2>
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <div className="border py-2 px-3 rounded-md bg-input flex items-center gap-2">
          <label htmlFor="search">
            <Search className="size-4 text-muted-foreground" />
          </label>
          <input
            id="search"
            className="outline-none text-sm text-muted-foreground"
            placeholder="Search documents..."
            onChange={(e) => onSearch(e.target.value)}
            defaultValue={searchTerm}
          />
        </div>
        <Select
          value={String(days)}
          onValueChange={(value: string) =>
            navigate({
              to: '.',
              search: { ...searchParams, days: Number(value) },
            })
          }
        >
          <SelectTrigger className="rounded-md px-3 py-2 !h-auto">
            <ListFilter className="size-4 text-foreground" />
            <SelectValue className="text-sm" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={sort}
          onValueChange={(value: 'a-z' | 'z-a' | 'newest' | 'lastViewed') =>
            navigate({
              to: '.',
              search: {
                ...searchParams,
                sort: value === 'a-z' ? undefined : value,
              },
            })
          }
        >
          <SelectTrigger className="rounded-md px-3 py-2 !h-auto">
            <ListFilter className="size-4 text-foreground" />
            <SelectValue className="text-sm" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a-z">A-Z</SelectItem>
            <SelectItem value="z-a">Z-A</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="lastViewed">Last Viewed</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
