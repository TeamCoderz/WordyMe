/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { RecentViewedDocumentItem } from '@/components/Home/RecentViewedDocumentItem';
import { getHomeRecentViewsDocumentsQueryOptions } from '@/queries/documents';
import { Button } from '@repo/ui/components/button';
import { Skeleton } from '@repo/ui/components/skeleton';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';

export const HomeRecentViewsDocuments = () => {
  const { data, isLoading } = useQuery(getHomeRecentViewsDocumentsQueryOptions('lastViewed'));

  return (
    <div className="flex flex-col gap-4 @container">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="md:text-xl text-base font-medium">Recent Views</h2>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/docs/recent-viewed">View more</Link>
          </Button>
        </div>
      </div>
      <div className="grid @min-[36rem]:grid-cols-5 grid-cols-3 gap-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="p-4 flex flex-col gap-7 flex-1 bg-home-card rounded-md h-36">
              <div className="space-y-3">
                <div className="bg-muted p-2 rounded-md w-fit">
                  <Skeleton className="h-4 w-4" />
                </div>
                <Skeleton className="h-4 w-3/4" />
              </div>
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))
        ) : (data?.length ?? 0) === 0 ? (
          <div className="col-span-5 text-center text-muted-foreground p-4">
            <p className="h-28">No recent views yet</p>
          </div>
        ) : (
          data?.map((document) => (
            <RecentViewedDocumentItem key={document.id} document={document} />
          ))
        )}
      </div>
    </div>
  );
};
