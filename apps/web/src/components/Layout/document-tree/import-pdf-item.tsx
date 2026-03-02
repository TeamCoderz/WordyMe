import { usePdfStore } from '@/store/import-pdf-store';
import { ContextMenuItem } from '@repo/ui/components/context-menu';
import { FilePlus } from '@repo/ui/components/icons';
import { useNavigate } from '@tanstack/react-router';

export default function ImportPdfItem() {
  const { setPdfFile } = usePdfStore();
  const navigate = useNavigate();

  const handleImportPdf = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || file.type !== 'application/pdf') return;

      const url = URL.createObjectURL(file);
      setPdfFile(url);

      navigate({ to: '/pdf/view/$id', params: { id: '1' } });
    };

    input.click();
  };

  return (
    <ContextMenuItem onSelect={handleImportPdf}>
      <FilePlus className="mr-2 h-4 w-4" />
      Import PDF
    </ContextMenuItem>
  );
}
