/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Skeleton } from '@repo/ui/components/skeleton';

interface FavoriteItemSkeletonProps {
  count?: number;
  showIcon?: boolean;
  showButton?: boolean;
}

export function FavoriteItemSkeleton({
  count = 4,
  showIcon = true,
  showButton = true,
}: FavoriteItemSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="p-4 flex gap-3 items-center flex-1 bg-primary-foreground rounded-md"
        >
          {showIcon && (
            <div className="bg-muted p-2 rounded-md">
              <Skeleton className="h-4 w-4" />
            </div>
          )}
          <Skeleton className="h-4 flex-1" />
          {showButton && <Skeleton className="h-8 w-8 rounded" />}
        </div>
      ))}
    </>
  );
}
