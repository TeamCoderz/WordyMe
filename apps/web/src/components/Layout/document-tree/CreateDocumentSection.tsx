/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';

import * as React from 'react';
import { Info, X } from '@repo/ui/components/icons';
import { alert } from '@/components/Layout/alert';
import { cn } from '@repo/ui/lib/utils';
import { useLocalStorage } from '@repo/ui/hooks/use-local-storage';
import { SidebarMenuButton } from '@repo/ui/components/sidebar';

export function CreateDocumentSection() {
  const [isHidden, setIsHidden] = useLocalStorage('create-document-section-hidden', false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);

  if (isHidden) return null;

  return (
    <SidebarMenuButton
      className={cn(
        'cursor-pointer border-1 border-dashed mt-1 select-none relative',
        'bg-accent/50 hover:bg-accent/70',
        'hover:bg-[#FFCC00]/[6%] hover:border-[#FFCC00]/20 hover:text-[#FFCC00]',
        'focus-visible:bg-[#FFCC00]/[6%] focus-visible:border-[#FFCC00]/20 focus-visible:text-[#FFCC00]',
        isAlertOpen && 'bg-[#FFCC00]/[6%] border-[#FFCC00]/20 text-[#FFCC00]',
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsAlertOpen(true);
        alert({
          title: 'Are you absolutely sure?',
          description:
            "This action cannot be undone. A one time message, once you close it you'll never see it again.",
          confirmText: 'Confirm',
          cancelText: 'Cancel',
          onConfirm: () => {
            setIsHidden(true);
            setIsAlertOpen(false);
          },
          onCancel: () => {
            setIsAlertOpen(false);
          },
        });
      }}
    >
      <Info className="size-4" />
      <div className="font-medium text-sm flex-1">Right-click to create</div>
      <X className="size-4" />
    </SidebarMenuButton>
  );
}
