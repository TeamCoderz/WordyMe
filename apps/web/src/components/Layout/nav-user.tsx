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
type NavUserProps = {
  variant?: 'sidebar' | 'avatar';
  dropdownMenuSide?: 'top' | 'bottom' | 'left' | 'right';
} & React.ComponentProps<typeof DropdownMenu> &
  React.ComponentProps<typeof SidebarMenu>;

export function NavUser({ variant = 'sidebar', dropdownMenuSide, ...props }: NavUserProps) {
  const { isMobile } = useSidebar();
  const user = useSelector((state) => state.user);

  if (variant === 'sidebar') {
    return (
      <SidebarMenu {...props}>
        <SidebarMenuItem>
          {user ? (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground p-0"
                >
                  <Avatar>
                    <AvatarImage
                      src={user.avatar_image?.calculatedImage ?? undefined}
                      alt={user.name ?? undefined}
                    />
                    <AvatarFallback>{user.name ? user.name[0] : undefined}</AvatarFallback>
                  </Avatar>
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
              />
            </DropdownMenu>
          ) : null}
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (variant === 'avatar') {
    return user ? (
      <DropdownMenu modal={false} {...props}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-accent-foreground/10!"
            aria-label="User menu"
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarImage
                src={user.avatar_image?.calculatedImage ?? undefined}
                alt={user.name ?? undefined}
              />
              <AvatarFallback>{user.name ? user.name[0] : undefined}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <MenuContent
          dropdownMenuSide={dropdownMenuSide}
          isMobile={isMobile}
          handleLogout={logout}
        />
      </DropdownMenu>
    ) : null;
  }
  return null;
}
function MenuContent({
  dropdownMenuSide,
  isMobile,

  handleLogout,
}: {
  dropdownMenuSide?: 'top' | 'bottom' | 'left' | 'right';
  isMobile: boolean;
  handleLogout: () => void;
}) {
  const user = useSelector((state) => state.user);
  const version = useSelector((state) => state.version);
  return (
    <>
      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
        side={dropdownMenuSide || (isMobile ? 'bottom' : 'right')}
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="p-0 font-normal" asChild>
          <Link to="/settings/profile" className="cursor-pointer">
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
          </Link>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="group" asChild>
            <Link to="/settings/profile">
              <Settings className="mr-2 group-hover:text-accent-foreground" />
              Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
          }}
        >
          Version {version}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 group-hover:text-accent-foreground" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </>
  );
}
