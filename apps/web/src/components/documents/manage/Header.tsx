/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as React from 'react';
import { useSelector } from '@/store';
import { DynamicIcon } from '@repo/ui/components/dynamic-icon';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@repo/ui/components/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';

export function ManageDocumentsHeader() {
  const activeSpace = useSelector((state: any) => state.activeSpace);

  if (!activeSpace) return null;

  return (
    <div className="mb-4 flex items-center gap-2">
      <DynamicIcon name={activeSpace.icon} className="size-4 text-muted-foreground" />
      <Breadcrumb>
        <BreadcrumbList>
          {(() => {
            const ancestors = (activeSpace.path ?? []) as any[];
            const totalCount = ancestors.length + 1;

            if (totalCount <= 4) {
              return (
                <>
                  {ancestors.map((space) => (
                    <React.Fragment key={space.id}>
                      <BreadcrumbItem>
                        <BreadcrumbLink className="truncate cursor-pointer text-sm hover:font-medium">
                          {space.name}
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                    </React.Fragment>
                  ))}
                  <BreadcrumbItem>
                    <BreadcrumbPage className="truncate text-sm font-medium">
                      {activeSpace.name}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              );
            }

            const first = ancestors[0];
            const second = ancestors[1];
            return (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink className="truncate cursor-pointer text-sm hover:font-medium">
                    {first.name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />

                <BreadcrumbItem>
                  <BreadcrumbLink className="truncate cursor-pointer text-sm hover:font-medium">
                    {second.name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />

                <BreadcrumbItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="outline-none">
                      <BreadcrumbEllipsis className="text-xs overflow-hidden" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      onCloseAutoFocus={(e) => e.preventDefault()}
                      className="p-2"
                      align="start"
                      sideOffset={6}
                    >
                      {ancestors.slice(2).map((hidden: any) => (
                        <DropdownMenuItem key={hidden.id} className="text-sm hover:font-medium">
                          {hidden.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </BreadcrumbItem>
                <BreadcrumbSeparator />

                <BreadcrumbItem>
                  <BreadcrumbPage className="truncate text-sm font-medium">
                    {activeSpace.name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            );
          })()}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
