'use client';

import { ChevronRight } from '@repo/ui/components/icons';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@repo/ui/components/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@repo/ui/components/sidebar';
import type { NavigationSection } from '@repo/types/navigation';
import { DynamicIcon } from '@repo/ui/components/dynamic-icon';
import { Link } from '@tanstack/react-router';
import { useLocation } from '@tanstack/react-router';

interface NavMainProps {
  items?: NavigationSection[];
}

export function NavMain({ items }: NavMainProps) {
  const { pathname } = useLocation();
  if (!items) return null;

  return (
    <>
      {items.map((section) => (
        <SidebarGroup key={section.id}>
          <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
          <SidebarMenu>
            {section.items.map((item) => {
              const isActive = pathname === item.url;
              const hasActiveChild = item.items?.some((subItem) => pathname === subItem.url);
              const shouldBeOpen = isActive || hasActiveChild;
              return (
                <Collapsible
                  key={item.id}
                  asChild
                  defaultOpen={shouldBeOpen}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.title} isActive={isActive}>
                        {item.icon && <DynamicIcon name={item.icon} />}
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => {
                          const isSubActive =
                            pathname === subItem.url || pathname.startsWith(`${subItem.url}/`);
                          return (
                            <SidebarMenuSubItem key={subItem.id}>
                              <SidebarMenuSubButton asChild isActive={isSubActive}>
                                <Link to={subItem.url}>
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}
