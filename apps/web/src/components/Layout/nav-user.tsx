/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@repo/ui/components/dropdown-menu';
import { Button } from '@repo/ui/components/button';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/avatar';
import { Link } from '@tanstack/react-router';
import { ChevronsUpDown, LogOut, Settings } from '@repo/ui/components/icons';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@repo/ui/components/sidebar';
import { useSelector } from '@/store';
import { logout } from '@repo/sdk/auth';
import { useState } from 'react';
import { ExternalLink, RefreshCw } from '@repo/ui/components/icons';
import { Badge } from '@repo/ui/components/badge';
import { cn } from '@repo/ui/lib/utils';
import { useUpdateStatus } from '@/hooks/use-update-status';
import { UpdateInstructionsDialog } from './update-instructions-dialog';
type NavUserProps = {
  variant?: 'sidebar' | 'avatar';
  dropdownMenuSide?: 'top' | 'bottom' | 'left' | 'right';
} & React.ComponentProps<typeof DropdownMenu> &
  React.ComponentProps<typeof SidebarMenu>;

export function NavUser({ variant = 'sidebar', dropdownMenuSide, ...props }: NavUserProps) {
  const { isMobile } = useSidebar();
  const user = useSelector((state) => state.user);
  const [open, setOpen] = useState(false);

  if (variant === 'sidebar') {
    return (
      <SidebarMenu {...props}>
        <SidebarMenuItem>
          {user ? (
            <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground p-0"
                >
                  <div className="relative">
                    <Avatar>
                      <AvatarImage
                        src={user.avatar_image?.calculatedImage ?? undefined}
                        alt={user.name ?? undefined}
                      />
                      <AvatarFallback>{user.name ? user.name[0] : undefined}</AvatarFallback>
                    </Avatar>
                    <UpdateDot />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <MenuContent
                dropdownMenuSide={dropdownMenuSide}
                isMobile={isMobile}
                handleLogout={logout}
                onClose={() => {
                  console.log('closing menu');
                  setOpen(false);
                }}
              />
            </DropdownMenu>
          ) : null}
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (variant === 'avatar') {
    return user ? (
      <DropdownMenu modal={false} open={open} onOpenChange={setOpen} {...props}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-accent-foreground/10!"
            aria-label="User menu"
          >
            <div className="relative">
              <Avatar className="size-8 rounded-lg">
                <AvatarImage
                  src={user.avatar_image?.calculatedImage ?? undefined}
                  alt={user.name ?? undefined}
                />
                <AvatarFallback>{user.name ? user.name[0] : undefined}</AvatarFallback>
              </Avatar>
              <UpdateDot />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <MenuContent
          dropdownMenuSide={dropdownMenuSide}
          isMobile={isMobile}
          handleLogout={async () => {
            const { data, error } = await logout();
            if (error || !data.success) {
              return;
            }
          }}
          onClose={() => setOpen(false)}
        />
      </DropdownMenu>
    ) : null;
  }
  return null;
}
/**
 * Version row plus update status.
 *
 * Deliberately silent when up to date: that is the state ~95% of the time, and
 * a permanent "you are up to date" line is noise. The refresh control is always
 * available for anyone who wants to ask.
 *
 * Nothing here is hover-only — the available version is visible text, so it
 * works on touch, reads to screen readers, and survives a support screenshot.
 */
function VersionSection() {
  const { status, isChecking, check } = useUpdateStatus();
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  // Operator opted out entirely: show what we always showed, nothing more.
  if (!status.enabled) {
    return (
      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
        Version {status.current}
      </DropdownMenuItem>
    );
  }

  return (
    <>
      <div className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <span className="truncate text-sm whitespace-nowrap">Version {status.current}</span>
          <button
            type="button"
            onClick={check}
            disabled={isChecking}
            aria-label="Check for updates"
            className="text-muted-foreground hover:text-foreground ml-auto shrink-0 rounded-sm p-1 transition-colors disabled:cursor-default"
          >
            <RefreshCw className={cn('size-3.5', isChecking && 'animate-spin')} />
          </button>
        </div>

        {status.updateAvailable && status.latest ? (
          <>
            {/* On its own line rather than beside the version: at this menu
                width the two together wrap, and a wrapped version number reads
                as broken rather than compact. */}
            <Badge
              variant="secondary"
              className="mt-1 px-1.5 py-0 text-[0.625rem] font-medium whitespace-nowrap"
            >
              {status.latest} available
            </Badge>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              {status.releaseUrl ? (
                <a
                  href={status.releaseUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs whitespace-nowrap underline underline-offset-2"
                >
                  Release notes
                  <ExternalLink className="size-3" />
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => setInstructionsOpen(true)}
                className="text-muted-foreground hover:text-foreground text-xs whitespace-nowrap underline underline-offset-2"
              >
                How to update
              </button>
            </div>
          </>
        ) : null}

        {status.status === 'unreachable' ? (
          <p className="text-muted-foreground mt-1.5 text-xs">Couldn&apos;t check for updates</p>
        ) : null}
      </div>

      <UpdateInstructionsDialog
        open={instructionsOpen}
        onOpenChange={setInstructionsOpen}
        latest={status.latest}
        releaseUrl={status.releaseUrl}
      />
    </>
  );
}

/**
 * The only always-visible surface, so it stays quiet: no animation, no count.
 * Not red — red reads as an error or an emergency, and a routine minor release
 * is neither. Colouring routine news red is how people learn to ignore red.
 */
function UpdateDot({ className }: { className?: string }) {
  const { status } = useUpdateStatus();
  if (!status.enabled || !status.updateAvailable) return null;

  return (
    <span
      role="status"
      aria-label="Update available"
      className={cn(
        'bg-primary ring-background absolute size-2 rounded-full ring-2',
        '-top-0.5 -right-0.5',
        className,
      )}
    />
  );
}

function MenuContent({
  dropdownMenuSide,
  isMobile,
  onClose,
  handleLogout,
}: {
  dropdownMenuSide?: 'top' | 'bottom' | 'left' | 'right';
  isMobile: boolean;
  handleLogout: () => void;
  onClose: () => void;
}) {
  const user = useSelector((state) => state.user);
  return (
    <>
      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-60"
        side={dropdownMenuSide || (isMobile ? 'bottom' : 'right')}
        align="end"
        sideOffset={4}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <Link to="/settings/profile" className="cursor-pointer" data-new-tab="true">
          <DropdownMenuLabel className="p-0 font-normal" onClick={onClose}>
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar>
                <AvatarImage
                  src={user?.avatar_image?.calculatedImage ?? undefined}
                  alt={user?.name ?? undefined}
                />
                <AvatarFallback>{user?.name ? user.name[0] : undefined}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-xs leading-tight">
                <span className="truncate font-semibold">{user?.name}</span>
                <span className="truncate text-[0.625rem] text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
        </Link>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link to="/settings/profile" data-new-tab="true">
            <DropdownMenuItem className="group" onClick={onClose}>
              <Settings className="mr-2 group-hover:text-accent-foreground" />
              Settings
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <VersionSection />
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 group-hover:text-accent-foreground" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </>
  );
}
