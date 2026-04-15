/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { DynamicIcon } from '@repo/ui/components/dynamic-icon';
import { Link } from '@tanstack/react-router';

type RecentViewedDocument = {
  id: string;
  name: string;
  handle?: string | null;
  icon?: string | null;
  lastViewedAt?: Date | null;
};

function formatRelativeTime(d?: Date | null): string {
  if (!d) return '-';
  const date = new Date(d);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function RecentViewedDocumentItem({ document }: { document: RecentViewedDocument }) {
  return (
    <Link
      to="/view/$handle"
      params={{ handle: (document as any).handle ?? document.id }}
      className="p-4 flex flex-col gap-7 bg-home-card rounded-md"
    >
      <div className="space-y-3 overflow-hidden">
        <div className="bg-muted p-2 rounded-md w-fit">
          <DynamicIcon name={document.icon || 'file'} className="size-4" />
        </div>
        <div className="min-w-0">
          <span className="text-sm block truncate">{document.name}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{formatRelativeTime(document.lastViewedAt)}</p>
    </Link>
  );
}
