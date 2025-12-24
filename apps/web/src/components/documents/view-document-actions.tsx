import { PencilLineIcon, PrinterIcon, FileOutputIcon } from '@repo/ui/components/icons';
import { Link } from '@tanstack/react-router';
import { getDocumentByHandleQueryOptions, useExportDocumentMutation } from '@/queries/documents';
import { Button } from '@repo/ui/components/button';
import { Portal } from '@repo/ui/components/portal';
import { SidebarTrigger } from '@repo/ui/components/sidebar';
import { useQuery } from '@tanstack/react-query';

interface ViewDocumentActionsProps {
  handle: string;
}

export function ViewDocumentActions({ handle }: ViewDocumentActionsProps) {
  const { data: document } = useQuery(getDocumentByHandleQueryOptions(handle));
  const exportDocumentMutation = useExportDocumentMutation(document?.id ?? '', document?.name);
  return (
    <Portal container="#app-toolbar">
      <>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="size-9 p-0! md:w-auto md:px-3! font-normal" asChild>
            <Link to="/edit/$handle" params={{ handle: document?.handle ?? document?.id ?? '' }}>
              <PencilLineIcon />
              <span className="max-md:sr-only text-start">Edit</span>
            </Link>
          </Button>
          <Button
            variant="outline"
            className="size-9 p-0! md:w-auto md:px-3! font-normal"
            onClick={() => exportDocumentMutation.mutate()}
          >
            <FileOutputIcon />
            <span className="max-md:sr-only text-start">Export</span>
          </Button>
          <Button
            variant="outline"
            className="size-9 p-0! md:w-auto md:px-3! font-normal"
            onClick={() => window.print()}
          >
            <PrinterIcon />
            <span className="max-md:sr-only text-start">Print</span>
          </Button>
        </div>
        <SidebarTrigger variant="outline" className="size-9 !p-2 [&>svg]:rotate-180 md:hidden" />
      </>
    </Portal>
  );
}
