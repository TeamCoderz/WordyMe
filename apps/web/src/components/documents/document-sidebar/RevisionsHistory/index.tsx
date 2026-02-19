/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { History } from '@repo/ui/components/icons';
import { useSelector } from '@/store';
import { RevisionCard } from './RevisionCard';
import { useSuspenseQuery } from '@tanstack/react-query';
import { getRevisionsByDocumentIdQueryOptions } from '@/queries/revisions';
import { getDocumentByHandleQueryOptions } from '@/queries/documents';

export function RevisionHistory({ handle }: { handle: string }) {
  const user = useSelector((state) => state.user);
  const { data: document } = useSuspenseQuery(getDocumentByHandleQueryOptions(handle));
  const { data: revisions } = useSuspenseQuery(
    getRevisionsByDocumentIdQueryOptions(document?.id ?? ''),
  );

  return (
    <div className="flex flex-col text-sm p-3 gap-2 h-full overflow-x-hidden overflow-y-auto scrollbar-thin">
      {revisions?.map((revision) => (
        <RevisionCard
          key={revision.id}
          handle={handle}
          revision={{
            ...revision,
            author: {
              id: user!.id,
              email: user!.email,
              handle: user!.username,
              image: user!.avatar_image?.url,
              name: user!.name,
            }, // todo: replace with revision author
          }}
        />
      ))}
    </div>
  );
}

export function RevisionHistoryHeader() {
  return (
    <div className="flex items-center gap-2 p-4 shrink-0 truncate">
      <History className="size-4" />
      Revisions
    </div>
  );
}
