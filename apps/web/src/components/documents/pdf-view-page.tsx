import { useSelector } from '@/store';
import { usePdfStore } from '@/store/import-pdf-store';
import { SidebarProvider } from '@repo/ui/components/sidebar';
import { useMediaQuery } from '@repo/ui/hooks/use-media-query';
import { cn } from '@repo/ui/lib/utils';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { Button } from '@repo/ui/components/button';
import { StepBack, StepForward } from '@repo/ui/components/icons';
import { Input } from '@repo/ui/components/input';
import { Skeleton } from '@repo/ui/components/skeleton';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function PdfViewPage() {
  const sidebar = useSelector((state) => state.sidebar);
  const pdfStore = usePdfStore();
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());
  const [hasNavigated, setHasNavigated] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const pageWidth = useRef(
    typeof window !== 'undefined' ? Math.min(600, window.innerWidth - 64) : 600,
  ).current;

  const defaultOpen = useMemo(() => {
    if (sidebar === 'expanded') return true;
    if (sidebar === 'collapsed') return false;
    if (typeof document === 'undefined') return true;
    const match = window.document.cookie.match(/(?:^|; )sidebar_state=([^;]*)/);
    if (!match) return true;
    try {
      return decodeURIComponent(match[1]) === 'true';
    } catch {
      return match[1] === 'true';
    }
  }, [sidebar]);

  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [openDesktop, setOpenDesktop] = useState(defaultOpen);
  const [openMobile, setOpenMobile] = useState(false);

  const toggleSidebar = useCallback(
    (open: boolean) => (isDesktop ? setOpenDesktop(open) : setOpenMobile(open)),
    [isDesktop],
  );

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
    setRenderedPages(new Set());
    setHasNavigated(false);
  };

  const markPageRendered = useCallback((page: number) => {
    setRenderedPages((prev) => {
      if (prev.has(page)) return prev;
      const next = new Set(prev);
      next.add(page);
      return next;
    });
  }, []);

  const goToPrev = useCallback(() => {
    setHasNavigated(true);
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const goToNext = useCallback(() => {
    setHasNavigated(true);
    setCurrentPage((p) => Math.min(numPages ?? p, p + 1));
  }, [numPages]);

  const handlePageInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value);
      if (!isNaN(val) && val >= 1 && numPages && val <= numPages) {
        setHasNavigated(true);
        setCurrentPage(val);
      }
    },
    [numPages],
  );

  const skeletonSize = pageSize ?? {
    width: pageWidth,
    height: Math.round(pageWidth * 1.414),
  };

  const nextPage = numPages ? Math.min(numPages, currentPage + 1) : null;
  const prevPage = currentPage > 1 ? currentPage - 1 : null;

  const pagesToMount = new Set([currentPage]);
  if (hasNavigated) {
    if (nextPage) pagesToMount.add(nextPage);
    if (prevPage) pagesToMount.add(prevPage);
  }

  const isCurrentPageReady = renderedPages.has(currentPage);

  return (
    <SidebarProvider
      className={cn(
        'group/editor-sidebar relative flex flex-1 flex-col items-center min-h-auto',
        '**:data-collapsible:sticky **:data-collapsible:top-[calc(--spacing(14)+1px)]',
      )}
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 90)',
          '--sidebar-width-icon': 'calc(var(--spacing) * 14)',
        } as React.CSSProperties
      }
      defaultOpen={defaultOpen}
      open={isDesktop ? openDesktop : openMobile}
      onOpenChange={toggleSidebar}
    >
      <div className="flex flex-col items-center w-full h-full overflow-auto bg-muted/40">
        {pdfStore.pdfFile ? (
          <>
            <div
              ref={containerRef}
              className="flex flex-1 items-center justify-center w-full py-8 px-4"
            >
              <Document
                file={pdfStore.pdfFile}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={(err) => console.error(err)}
                loading={<Skeleton style={skeletonSize} className="rounded-sm" />}
              >
                <div
                  className="relative shadow-2xl rounded-sm ring-1 ring-border overflow-hidden"
                  style={skeletonSize}
                >
                  {!isCurrentPageReady && (
                    <div className="absolute inset-0 z-10">
                      <Skeleton className="w-full h-full" />
                    </div>
                  )}

                  {Array.from(pagesToMount).map((pageNum) => {
                    const isCurrent = pageNum === currentPage;
                    const isReady = renderedPages.has(pageNum);
                    return (
                      <div
                        key={pageNum}
                        className={cn(
                          'absolute inset-0',
                          isCurrent && isReady ? 'opacity-100 z-1' : 'opacity-0 z-0',
                        )}
                        aria-hidden={!isCurrent}
                      >
                        <Page
                          pageNumber={pageNum}
                          width={pageWidth}
                          renderTextLayer={isCurrent}
                          renderAnnotationLayer={isCurrent}
                          onRenderSuccess={() => markPageRendered(pageNum)}
                          onLoadSuccess={(page) => {
                            if (isCurrent) {
                              const scale = pageWidth / page.originalWidth;
                              setPageSize({
                                width: pageWidth,
                                height: Math.round(page.originalHeight * scale),
                              });
                            }
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </Document>
            </div>

            <div className="sticky bottom-0 w-full flex items-center justify-center gap-4 py-3 px-6 bg-background/80 backdrop-blur border-t border-border">
              <Button onClick={goToPrev} disabled={currentPage <= 1}>
                <StepBack />
              </Button>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Page</span>
                <Input
                  type="number"
                  min={1}
                  max={numPages ?? 1}
                  value={currentPage}
                  onChange={handlePageInputChange}
                  className="w-12.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-center"
                />
                <span>of {numPages ?? '—'}</span>
              </div>

              <Button onClick={goToNext} disabled={!numPages || currentPage >= numPages}>
                <StepForward />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
            No PDF selected
          </div>
        )}
      </div>
    </SidebarProvider>
  );
}
