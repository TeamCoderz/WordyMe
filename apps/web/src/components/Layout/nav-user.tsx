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
import { RefreshCw } from '@repo/ui/components/icons';
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
 * The status line is permanent — "Up to date" shows rather than the row falling
 * silent. It keeps the row a constant height so the menu never jumps, and it
 * makes a working check visible even when there is nothing to do.
 *
 * Nothing here is hover-only — the available version is visible text, so it
 * works on touch, reads to screen readers, and survives a support screenshot.
 */
function VersionSection() {
  const { status, isChecking, check } = useUpdateStatus();
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  // Operator opted out entirely. A plain div rather than a DropdownMenuItem:
  // the item styling adds a hover background and its own text colour, which
  // makes static text look interactive. Matches the enabled row exactly.
  if (!status.enabled) {
    return (
      <div className="px-2 py-1.5">
        <span className="text-muted-foreground text-sm tabular-nums whitespace-nowrap">
          Version {status.current}
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
        {/* current → latest on one line: the transition is the message, and it
            reads faster than a version plus a separate badge.
            The app's sans, not monospace — this sits between "Settings" and
            "Log out", and mono would read as terminal output while costing
            ~20% more width in a menu that has none to spare.
            tabular-nums keeps the digits from shifting as versions change. */}
        <div className="flex items-center gap-2">
          <span className="truncate text-sm tabular-nums whitespace-nowrap">
            <span className="text-muted-foreground">Version {status.current}</span>
            {status.updateAvailable && status.latest ? (
              <>
                <span className="text-muted-foreground mx-1.5" aria-hidden="true">
                  →
                </span>
                {/* The new version number is itself the link to the notes —
                    one target instead of a separate "Release notes" label. */}
                {status.releaseUrl ? (
                  <a
                    href={status.releaseUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    title={`Release notes for ${status.latest}`}
                    className="decoration-muted-foreground/40 hover:decoration-foreground font-medium underline underline-offset-2"
                  >
                    {status.latest}
                  </a>
                ) : (
                  <span className="font-medium">{status.latest}</span>
                )}
              </>
            ) : null}
          </span>
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

        {/* Status stays put in every state, so the row never changes height and
            the check is visibly working even when there is nothing to do. */}
        <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
          <span>
            {status.status === 'unreachable'
              ? "Couldn't check for updates"
              : status.updateAvailable
                ? 'Update available'
                : 'Up to date'}
          </span>
          {status.updateAvailable ? (
            <>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => setInstructionsOpen(true)}
                className="hover:text-foreground whitespace-nowrap hover:underline hover:underline-offset-2"
              >
                How to update
              </button>
            </>
          ) : null}
        </div>
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
        'ring-background absolute size-2 rounded-full bg-emerald-400 ring-2',
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
