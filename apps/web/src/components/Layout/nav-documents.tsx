import { SidebarGroup, SidebarGroupLabel } from '@repo/ui/components/sidebar';
import { DocumentTree } from './document-tree';
import { cn } from '@repo/ui/lib/utils';
import { Link } from '@tanstack/react-router';
import { useSelector } from '@/store';

export function NavDocuments(props: React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const activeSpace = useSelector((state) => state.activeSpace);
  return (
    <SidebarGroup
      {...props}
      className={cn('group-data-[collapsible=icon]:hidden flex-1 min-h-0', props.className)}
    >
      <SidebarGroupLabel asChild>
        <Link to="/docs/manage">
          {(activeSpace?.path?.length ?? 0 > 0) ? activeSpace?.name : 'Documents'}
        </Link>
      </SidebarGroupLabel>
      <DocumentTree />
    </SidebarGroup>
  );
}
