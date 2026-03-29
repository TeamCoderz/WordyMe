/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useMemo } from 'react';
import { EmbedPDF } from '@embedpdf/core/react';
import { usePdfiumEngine } from '@embedpdf/engines/react';
import { createPluginRegistration } from '@embedpdf/core';
import { ViewportPluginPackage, Viewport } from '@embedpdf/plugin-viewport/react';
import { ScrollPluginPackage, ScrollStrategy, Scroller } from '@embedpdf/plugin-scroll/react';
import {
  DocumentManagerPluginPackage,
  DocumentContent,
} from '@embedpdf/plugin-document-manager/react';
import {
  InteractionManagerPluginPackage,
  GlobalPointerProvider,
  PagePointerProvider,
} from '@embedpdf/plugin-interaction-manager/react';
import {
  ZoomMode,
  ZoomPluginPackage,
  MarqueeZoom,
  ZoomGestureWrapper,
} from '@embedpdf/plugin-zoom/react';
import { PanPluginPackage } from '@embedpdf/plugin-pan/react';
import { SpreadMode, SpreadPluginPackage } from '@embedpdf/plugin-spread/react';
import { Rotate, RotatePluginPackage } from '@embedpdf/plugin-rotate/react';
import { RenderLayer, RenderPluginPackage } from '@embedpdf/plugin-render/react';
import { TilingLayer, TilingPluginPackage } from '@embedpdf/plugin-tiling/react';
import { RedactionLayer, RedactionPluginPackage } from '@embedpdf/plugin-redaction/react';
import { ExportPluginPackage } from '@embedpdf/plugin-export/react';
import { PrintPluginPackage } from '@embedpdf/plugin-print/react';
import { SelectionLayer, SelectionPluginPackage } from '@embedpdf/plugin-selection/react';
import { SearchLayer, SearchPluginPackage } from '@embedpdf/plugin-search/react';
import { ThumbnailPluginPackage } from '@embedpdf/plugin-thumbnail/react';
import { MarqueeCapture, CapturePluginPackage } from '@embedpdf/plugin-capture/react';
import { FullscreenPluginPackage } from '@embedpdf/plugin-fullscreen/react';
import { HistoryPluginPackage } from '@embedpdf/plugin-history/react';
import { AnnotationPluginPackage, AnnotationLayer } from '@embedpdf/plugin-annotation/react';
import { PdfAnnotationSubtype, PdfActionType } from '@embedpdf/models';
import type { PdfLinkAnnoObject } from '@embedpdf/models';
import { CommandsPluginPackage } from '@embedpdf/plugin-commands/react';
import {
  UIPluginPackage,
  UIProvider,
  UIRenderers,
  useSchemaRenderer,
  useSelectionMenu,
} from '@embedpdf/plugin-ui/react';
import { LoadingSpinner } from './components/loading-spinner';
import { DocumentPasswordPrompt } from './components/document-password-prompt';
import { PageControls } from './components/page-controls';
import { EmptyState } from './components/empty-state';
import { commands } from './config/commands';
import { viewerUISchema } from './config/ui-schema';
import { SchemaToolbar } from './ui/schema-toolbar';
import { SchemaPanel } from './ui/schema-panel';
import { SchemaMenu } from './ui/schema-menu';
import { SearchSidebar } from './components/search-sidebar';
import { OutlineSidebar } from './components/outline-sidebar';
import { ThumbnailsSidebar } from './components/thumbnails-sidebar';
import { ZoomToolbar } from './components/zoom-toolbar';
import { SchemaSelectionMenu } from './ui/schema-selection-menu';

/**
 * Schema-Driven Viewer Page
 *
 * This viewer demonstrates the power of the UI plugin and schema-driven architecture.
 * Instead of hardcoding the toolbar components, the UI is defined declaratively
 * in the UI schema and rendered dynamically.
 *
 * Benefits:
 * - Declarative UI configuration
 * - Type-safe schema
 * - Easily customizable and extensible
 * - Consistent UI patterns
 * - Separation of concerns
 */

export interface PDFViewerProps {
  url: string;
}

export function PDFViewer({ url }: PDFViewerProps) {
  const { engine, isLoading, error } = usePdfiumEngine();

  // Memoize UIProvider props to prevent unnecessary remounts
  const uiComponents = useMemo(
    () => ({
      'zoom-toolbar': ZoomToolbar,
      'thumbnails-sidebar': ThumbnailsSidebar,
      'search-sidebar': SearchSidebar,
      'outline-sidebar': OutlineSidebar,
    }),
    [],
  );

  const uiRenderers: UIRenderers = useMemo(
    () => ({
      toolbar: SchemaToolbar,
      sidebar: SchemaPanel,
      menu: SchemaMenu,
      selectionMenu: SchemaSelectionMenu,
    }),
    [],
  );

  const plugins = useMemo(
    () => [
      createPluginRegistration(DocumentManagerPluginPackage, {
        initialDocuments: [{ url }],
      }),
      createPluginRegistration(ViewportPluginPackage, {
        viewportGap: 10,
      }),
      createPluginRegistration(ScrollPluginPackage, {
        defaultStrategy: ScrollStrategy.Vertical,
      }),
      createPluginRegistration(InteractionManagerPluginPackage),
      createPluginRegistration(ZoomPluginPackage, {
        defaultZoomLevel: ZoomMode.FitPage,
      }),
      createPluginRegistration(PanPluginPackage),
      createPluginRegistration(SpreadPluginPackage, {
        defaultSpreadMode: SpreadMode.None,
      }),
      createPluginRegistration(RotatePluginPackage),
      createPluginRegistration(ExportPluginPackage),
      createPluginRegistration(PrintPluginPackage),
      createPluginRegistration(RenderPluginPackage),
      createPluginRegistration(TilingPluginPackage, {
        tileSize: 768,
        overlapPx: 2.5,
        extraRings: 0,
      }),
      createPluginRegistration(SelectionPluginPackage),
      createPluginRegistration(SearchPluginPackage),
      createPluginRegistration(RedactionPluginPackage),
      createPluginRegistration(CapturePluginPackage),
      createPluginRegistration(HistoryPluginPackage),
      createPluginRegistration(AnnotationPluginPackage),
      createPluginRegistration(FullscreenPluginPackage),
      createPluginRegistration(ThumbnailPluginPackage, {
        width: 120,
        paddingY: 10,
      }),
      // Commands plugin - provides command execution and state management
      createPluginRegistration(CommandsPluginPackage, {
        commands,
      }),
      // UI plugin - provides schema-driven UI rendering
      createPluginRegistration(UIPluginPackage, {
        schema: viewerUISchema,
      }),
    ],
    [url],
  );

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (isLoading || !engine) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const link =
      target.firstElementChild?.tagName === 'A'
        ? (target.firstElementChild as HTMLAnchorElement)
        : null;
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#')) return;

    e.preventDefault();
    e.stopPropagation();
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden" onClick={handleClick}>
      <div className="flex flex-1 select-none flex-col overflow-hidden *:flex *:flex-col *:flex-1">
        <EmbedPDF engine={engine} plugins={plugins}>
          {({ pluginsReady, activeDocumentId }) => (
            <>
              {pluginsReady ? (
                <div className="flex h-full flex-col flex-1">
                  {/* Schema-driven UI with UIProvider */}
                  {activeDocumentId ? (
                    <UIProvider
                      documentId={activeDocumentId}
                      components={uiComponents}
                      renderers={uiRenderers}
                      className="flex min-h-0 flex-1 flex-col overflow-hidden"
                    >
                      <ViewerLayout documentId={activeDocumentId} />
                    </UIProvider>
                  ) : (
                    <EmptyState />
                  )}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <LoadingSpinner message="Initializing plugins..." />
                </div>
              )}
            </>
          )}
        </EmbedPDF>
      </div>
    </div>
  );
}

/**
 * Viewer Layout
 *
 * Main layout component that uses useSchemaRenderer to render toolbars and panels.
 * This component replaces the old SchemaToolbarRenderer and SchemaPanelRenderer.
 */
function ViewerLayout({ documentId }: { documentId: string }) {
  const { renderToolbar, renderSidebar } = useSchemaRenderer(documentId);

  const annotationMenu = useSelectionMenu('annotation', documentId);
  const redactionMenu = useSelectionMenu('redaction', documentId);
  const selectionMenu = useSelectionMenu('selection', documentId);

  return (
    <>
      {/* Main Toolbar */}
      {renderToolbar('top', 'main')}

      {/* Secondary Toolbar (annotation/redaction/shapes) */}
      {renderToolbar('top', 'secondary')}

      {/* Document Content Area */}
      <div id="document-content" className="flex flex-1 overflow-hidden">
        {/* Left Panels */}
        {renderSidebar('left', 'main')}

        {/* Main Viewer */}
        <div className="flex-1 overflow-hidden">
          <DocumentContent documentId={documentId}>
            {({ documentState, isLoading, isError, isLoaded }) => (
              <>
                {isLoading && (
                  <div className="flex h-full items-center justify-center">
                    <LoadingSpinner message="Loading document..." />
                  </div>
                )}
                {isError && <DocumentPasswordPrompt documentState={documentState} />}
                {isLoaded && (
                  <div className="relative h-full w-full">
                    <GlobalPointerProvider documentId={documentId}>
                      <Viewport className="bg-background" documentId={documentId}>
                        <ZoomGestureWrapper documentId={documentId}>
                          <Scroller
                            documentId={documentId}
                            renderPage={({ pageIndex }) => (
                              <Rotate
                                documentId={documentId}
                                pageIndex={pageIndex}
                                style={{ backgroundColor: '#fff' }}
                              >
                                <PagePointerProvider documentId={documentId} pageIndex={pageIndex}>
                                  <RenderLayer
                                    documentId={documentId}
                                    pageIndex={pageIndex}
                                    scale={1}
                                    style={{ pointerEvents: 'none' }}
                                  />
                                  <TilingLayer
                                    documentId={documentId}
                                    pageIndex={pageIndex}
                                    style={{ pointerEvents: 'none' }}
                                  />
                                  <SearchLayer documentId={documentId} pageIndex={pageIndex} />
                                  <MarqueeZoom documentId={documentId} pageIndex={pageIndex} />
                                  <MarqueeCapture documentId={documentId} pageIndex={pageIndex} />
                                  <SelectionLayer
                                    documentId={documentId}
                                    pageIndex={pageIndex}
                                    selectionMenu={selectionMenu}
                                    textStyle={{
                                      background: 'rgb(95 183 255 / 50%)',
                                    }}
                                  />
                                  <RedactionLayer
                                    documentId={documentId}
                                    pageIndex={pageIndex}
                                    selectionMenu={redactionMenu}
                                  />
                                  <AnnotationLayer
                                    documentId={documentId}
                                    pageIndex={pageIndex}
                                    selectionMenu={annotationMenu}
                                    customAnnotationRenderer={(props) => {
                                      if (props.annotation.type !== PdfAnnotationSubtype.LINK)
                                        return null;
                                      const linkAnno = props.annotation as PdfLinkAnnoObject;
                                      const target = linkAnno.target;
                                      if (!target || target.type !== 'action') return null;
                                      const action = target.action;
                                      if (action.type !== PdfActionType.URI) return null;
                                      const uri = action.uri;
                                      return (
                                        <a
                                          href={uri}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          style={{ cursor: 'pointer' }}
                                        >
                                          {props.children}
                                        </a>
                                      );
                                    }}
                                  />
                                </PagePointerProvider>
                              </Rotate>
                            )}
                          />
                        </ZoomGestureWrapper>
                        {/* Page Controls */}
                        <PageControls documentId={documentId} />
                      </Viewport>
                    </GlobalPointerProvider>
                  </div>
                )}
              </>
            )}
          </DocumentContent>
        </div>

        {/* Right Panels */}
        {renderSidebar('right', 'main')}
      </div>
    </>
  );
}
