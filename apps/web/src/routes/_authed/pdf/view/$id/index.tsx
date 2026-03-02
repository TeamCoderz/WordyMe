import { createFileRoute } from '@tanstack/react-router';
import { PdfViewPage } from '@/components/documents/pdf-view-page';

export const Route = createFileRoute('/_authed/pdf/view/$id/')({
  component: PdfViewPage,
});
