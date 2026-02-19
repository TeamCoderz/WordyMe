/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { FavoriteDocumentItem } from '@/components/Home/FavoriteDocumentItem';
import { getHomeFavoriteDocumentsQueryOptions } from '@/queries/documents';
import { SortOptions } from '@/types/sort';
import { Button } from '@repo/ui/components/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import { Skeleton } from '@repo/ui/components/skeleton';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ListFilter } from '@repo/ui/components/icons';

type HomeFavoriteDocumentsProps = {
  favoriteDocumentsSort: SortOptions;
  setFavoriteDocumentsSort: (value: SortOptions) => void;
};

export const HomeFavoriteDocuments = ({
  favoriteDocumentsSort,
  setFavoriteDocumentsSort,
}: HomeFavoriteDocumentsProps) => {
  const { data, isLoading } = useQuery(getHomeFavoriteDocumentsQueryOptions(favoriteDocumentsSort));

  return (
    <div className="flex flex-col gap-4 @container">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="md:text-xl text-base font-medium">Favorite Documents</h2>
        <div className="flex gap-2">
          <Select
            value={favoriteDocumentsSort}
            onValueChange={(value: SortOptions) => {
              setFavoriteDocumentsSort(value);
            }}
          >
            <SelectTrigger className="rounded-md px-3 py-2">
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
          <Button variant="outline" asChild>
            <Link to="/docs/favorites">View more</Link>
          </Button>
        </div>
      </div>
      <div className="grid @min-[36rem]:grid-cols-4 grid-cols-2 gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="p-4 flex gap-3 items-center flex-1 bg-home-card rounded-md">
              <div className="bg-muted p-2 rounded-md">
                <Skeleton className="size-5" />
              </div>
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="size-9 rounded" />
            </div>
          ))
        ) : (data?.length ?? 0) === 0 ? (
          <div className="col-span-4 text-center text-muted-foreground p-4">
            <p className="h-9">No favorite documents yet</p>
          </div>
        ) : (
          data?.map((document) => <FavoriteDocumentItem key={document.id} document={document} />)
        )}
      </div>
    </div>
  );
};
