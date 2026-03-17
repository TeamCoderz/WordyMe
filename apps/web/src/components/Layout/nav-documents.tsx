/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { SidebarGroup, SidebarGroupLabel } from '@repo/ui/components/sidebar';
import { DocumentTree } from './document-tree';
import { cn } from '@repo/ui/lib/utils';
import { Link } from '@tanstack/react-router';
import { useSelector } from '@/store';

export function NavDocuments(props: React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const activeSpace = useSelector((state) => state.wordy.activeSpace[state.tabs.activePane]);
  return (
    <SidebarGroup
      {...props}
      className={cn('group-data-[collapsible=icon]:hidden flex-1 min-h-0', props.className)}
    >
      <div className="flex gap-1 w-full justify-between items-center">
        <SidebarGroupLabel asChild>
          <Link to="/docs/manage" data-new-tab="true">
            {(activeSpace?.path?.length ?? 0 > 0) ? activeSpace?.name : 'Documents'}
          </Link>
        </SidebarGroupLabel>
      </div>
      <DocumentTree />
    </SidebarGroup>
  );
}
