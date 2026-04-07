/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { PDFViewer } from '@repo/embed-pdf/viewer';

function toAbsolutePdfUrl(pdfUrl: string | null | undefined): string {
  if (!pdfUrl) return '';
  if (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://')) return pdfUrl;
  const base = import.meta.env.VITE_BACKEND_URL ?? '';
  return `${base}${pdfUrl.startsWith('/') ? pdfUrl : `/${pdfUrl}`}`;
}

export function ViewPDF({ pdfUrl }: { pdfUrl: string | null }) {
  const url = toAbsolutePdfUrl(pdfUrl);

  return (
    <div className="flex flex-col w-full h-[calc(100svh---spacing(28)-1px)]! max-h-[calc(100svh---spacing(28)-1px)]! overflow-hidden">
      {url ? (
        <PDFViewer url={url} />
      ) : (
        <div className="text-muted-foreground flex flex-1 items-center justify-center p-6 text-sm">
          PDF is not available for this document.
        </div>
      )}
    </div>
  );
}
