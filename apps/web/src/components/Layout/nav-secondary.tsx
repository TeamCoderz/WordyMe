'use client';

import * as React from 'react';
import { Link, useLocation } from '@tanstack/react-router';

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@repo/ui/components/sidebar';
import type { NavigationItem } from '@repo/types/navigation';
import { DynamicIcon } from '@repo/ui/components/dynamic-icon';
import { LoaderIcon } from '@repo/ui/components/icons';

interface NavSecondaryProps {
  items?: NavigationItem[];
}

export function NavSecondary({
  items,
  ...props
}: NavSecondaryProps & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const { pathname } = useLocation();
  if (!items) return null;
  if (items.length === 0) return null;

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = pathname === item.url || pathname.startsWith(`${item.url}/`);
            return (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton asChild size="sm" isActive={isActive}>
                  <Link to={item.url}>
                    {item.icon && <DynamicIcon name={item.icon} fallback={() => <LoaderIcon />} />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
