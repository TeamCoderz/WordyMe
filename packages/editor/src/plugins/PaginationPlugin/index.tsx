import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $generateNodesFromSerializedNodes } from '@lexical/clipboard';
import { $getNearestNodeOfType, $wrapNodeInElement, mergeRegister } from '@lexical/utils';
import {
  $addUpdateTag,
  $createParagraphNode,
  $getNearestNodeFromDOMNode,
  $getNearestRootOrShadowRoot,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  $isRootNode,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_LOW,
  createCommand,
  DELETE_CHARACTER_COMMAND,
  HISTORIC_TAG,
  HISTORY_MERGE_TAG,
  isHTMLElement,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  LexicalCommand,
  NodeKey,
  RootNode,
  SELECTION_CHANGE_COMMAND,
  SKIP_SCROLL_INTO_VIEW_TAG,
} from 'lexical';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  $createPageNode,
  $createPageContentNode,
  $createPageFooterNode,
  $createPageHeaderNode,
  $isPageContentNode,
  $isPageFooterNode,
  $isPageHeaderNode,
  $isPageNode,
  PageContentNode,
  PageNode,
  $isPageSetupNode,
  $createPageSetupNode,
  PageSetupNode,
  $getPageSetupNode,
  PAGE_SIZES,
  PageHeaderNode,
  PageFooterNode,
  EMPTY_PARAGRAPH,
  HeaderConfig,
  FooterConfig,
  $isPageNumberNode,
  $createPageNumberNode,
  PageNumberNode,
  PageNumberVariant,
} from '@repo/editor/nodes/PageNode';
import {
  $createPageBreakNode,
  $isPageBreakNode,
  PageBreakNode,
} from '@repo/editor/nodes/PageBreakNode';
import { useActions } from '@repo/editor/store';
import { useDebouncedCallback } from '@repo/ui/hooks/use-debounce';

// Exported commands
export const INSERT_PAGE_BREAK: LexicalCommand<undefined> = createCommand('INSERT_PAGE_BREAK');
export const INSERT_PAGE_NUMBER_COMMAND: LexicalCommand<PageNumberVariant> = createCommand(
  'INSERT_PAGE_NUMBER_COMMAND',
);

export default function PaginationPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isPageStructureInvalid, setIsPageStructureInvalid] = useState(false);
  const isMountedRef = useRef(false);
  const isTouchedRef = useRef(false);

  // Shared RAF ref for scheduled updates
  const rafIdRef = useRef<number | null>(null);
  const headerRafIdRef = useRef<number | null>(null);
  const footerRafIdRef = useRef<number | null>(null);
  const pageNumberRafIdRef = useRef<number | null>(null);

  const previousPageKeyRef = useRef<NodeKey | null>(null);
  const mutatedHeaderKeyRef = useRef<NodeKey | null>(null);
  const mutatedFooterKeyRef = useRef<NodeKey | null>(null);

  const { updateEditorStoreState } = useActions();

  // ==================== ZOOM & DIMENSIONS ====================
  const updateZoom = useCallback(() => {
    const rootElement = editor.getRootElement();
    if (!rootElement) return;
    const PAGE_WIDTH = parseInt(document.documentElement.style.getPropertyValue('--page-width'));
    if (!PAGE_WIDTH) return;
    const prevZoom = +(rootElement.style.zoom || '1');
    const rootWidth = Math.floor(rootElement.scrollWidth * prevZoom);
    const rootPadding = parseFloat(getComputedStyle(rootElement).paddingLeft) * 2;
    const nextZoom = Math.ceil(Math.min(rootWidth / (PAGE_WIDTH + rootPadding), 1) * 10000) / 10000;
    const diff = +Math.abs(+nextZoom - +prevZoom).toFixed(4);
    if (diff <= 0.0001) return;
    rootElement.style.zoom = nextZoom.toString();
  }, [editor]);

  const updatePageDimensions = useCallback(() => {
    editor.getEditorState().read(() => {
      const pageSetupNode = $getPageSetupNode();
      if (!pageSetupNode) return;
      const pageSetup = pageSetupNode.getPageSetup();
      const { isPaged, pageSize, orientation, margins } = pageSetup;
      const documentElement = document.documentElement;
      if (isPaged) {
        documentElement.dataset.paged = 'true';
        const pageWidth =
          PAGE_SIZES[pageSize][orientation === 'portrait' ? 'width' : 'height'] + 'px';
        const pageHeight =
          PAGE_SIZES[pageSize][orientation === 'portrait' ? 'height' : 'width'] + 'px';
        documentElement.style.setProperty('--page-width', pageWidth);
        documentElement.style.setProperty('--page-height', pageHeight);
        const marginTop = (margins.top * 96).toFixed(1) + 'px';
        const marginRight = (margins.right * 96).toFixed(1) + 'px';
        const marginBottom = (margins.bottom * 96).toFixed(1) + 'px';
        const marginLeft = (margins.left * 96).toFixed(1) + 'px';
        documentElement.style.setProperty('--page-margin-top', marginTop);
        documentElement.style.setProperty('--page-margin-right', marginRight);
        documentElement.style.setProperty('--page-margin-bottom', marginBottom);
        documentElement.style.setProperty('--page-margin-left', marginLeft);
        updateZoom();
      } else {
        documentElement.dataset.paged = 'false';
        documentElement.style.removeProperty('--page-width');
        documentElement.style.removeProperty('--page-height');
        documentElement.style.removeProperty('--page-margin-top');
        documentElement.style.removeProperty('--page-margin-right');
        documentElement.style.removeProperty('--page-margin-bottom');
        documentElement.style.removeProperty('--page-margin-left');
        const rootElement = editor.getRootElement();
        if (!rootElement) return;
        rootElement.style.zoom = '';
      }
    });
  }, [editor, updateZoom]);

  useEffect(() => {
    return editor.registerMutationListener(PageSetupNode, updatePageDimensions);
  }, [editor, updatePageDimensions]);

  // ==================== PAGE MEASUREMENT ====================
  const schedulePageMeasurement = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = requestAnimationFrame(() => {
      editor.update(
        () => {
          const root = $getRoot();
          const children = root.getChildren();
          const pages = children.filter((child) => $isPageNode(child));
          const pagesToFix = pages.filter((page) => page.isMarkedForMeasurement());
          pagesToFix.forEach((page) => page.fixFlow());
        },
        { tag: HISTORIC_TAG },
      );
    });
  }, [editor]);

  // ==================== HEADER SYNC ====================
  const syncHeadersFromPageSetup = useCallback(() => {
    if (headerRafIdRef.current !== null) {
      cancelAnimationFrame(headerRafIdRef.current);
    }
    headerRafIdRef.current = requestAnimationFrame(() => {
      editor.update(
        () => {
          $addUpdateTag(SKIP_SCROLL_INTO_VIEW_TAG);
          const pageSetupNode = $getPageSetupNode();
          if (!pageSetupNode) return;
          const { headers, isPaged } = pageSetupNode.getPageSetup();
          const headerChecksums = pageSetupNode.getHeadersChecksum();
          const headerNodes = $getRoot()
            .getChildren()
            .filter($isPageNode)
            .map((pageNode) => pageNode.getHeaderNode());

          headerNodes.forEach((headerNode) => {
            if (!headers.enabled || !isPaged) {
              headerNode.clear();
              return;
            }
            if (headerNode.isDirty()) return;
            if (headerNode.getKey() === mutatedHeaderKeyRef.current) return;
            const variant = headerNode.getVariant();
            const nextNodes = headers[variant] ?? [EMPTY_PARAGRAPH];
            const nextChecksum = headerChecksums[variant];
            const previousChecksum = headerNode.getChecksum();
            if (previousChecksum === nextChecksum) return;
            headerNode.clear();
            const nodes = $generateNodesFromSerializedNodes(nextNodes);
            nodes.forEach((node) => headerNode.append(node));
          });
        },
        {
          tag: HISTORY_MERGE_TAG,
          discrete: true,
        },
      );
    });
  }, [editor]);

  const syncHeadersToPageSetup = useDebouncedCallback((nodeKey: NodeKey) => {
    editor.update(
      () => {
        const headerNode = $getNodeByKey(nodeKey);
        if (!$isPageHeaderNode(headerNode)) return;
        const pageSetupNode = $getPageSetupNode();
        if (!pageSetupNode) return;
        const { headers, isPaged } = pageSetupNode.getPageSetup();
        if (!headers.enabled || !isPaged) return;
        const variant = headerNode.getVariant();
        const nextNodes = headerNode.getSerializedChildren();
        const nextHeaders: HeaderConfig = { ...headers };
        if (variant === 'first') nextHeaders.first = nextNodes;
        else if (variant === 'even') nextHeaders.even = nextNodes;
        else nextHeaders.default = nextNodes;
        pageSetupNode.setHeaders(nextHeaders);
      },
      {
        discrete: true,
        tag: HISTORIC_TAG,
      },
    );
  }, 500);

  // ==================== FOOTER SYNC ====================
  const syncFootersFromPageSetup = useCallback(() => {
    if (footerRafIdRef.current !== null) {
      cancelAnimationFrame(footerRafIdRef.current);
    }
    footerRafIdRef.current = requestAnimationFrame(() => {
      editor.update(
        () => {
          $addUpdateTag(SKIP_SCROLL_INTO_VIEW_TAG);
          const pageSetupNode = $getPageSetupNode();
          if (!pageSetupNode) return;
          const pageSetup = pageSetupNode.getPageSetup();
          const footers = pageSetup.footers;
          const isPaged = pageSetup.isPaged;
          const footerChecksums = pageSetupNode.getFootersChecksum();
          const footerNodes = $getRoot()
            .getChildren()
            .filter($isPageNode)
            .map((pageNode) => pageNode.getFooterNode());

          footerNodes.forEach((footerNode) => {
            if (!footers.enabled || !isPaged) {
              footerNode.clear();
              return;
            }
            if (footerNode.isDirty()) return;
            if (footerNode.getKey() === mutatedFooterKeyRef.current) return;
            const variant = footerNode.getVariant();
            const nextNodes = footers[variant] ?? [EMPTY_PARAGRAPH];
            const nextChecksum = footerChecksums[variant];
            const previousChecksum = footerNode.getChecksum();
            if (previousChecksum === nextChecksum) return;
            footerNode.clear();
            const nodes = $generateNodesFromSerializedNodes(nextNodes);
            nodes.forEach((node) => footerNode.append(node));
          });
        },
        {
          tag: HISTORY_MERGE_TAG,
          discrete: true,
        },
      );
    });
  }, [editor]);

  const syncFootersToPageSetup = useDebouncedCallback((nodeKey: NodeKey) => {
    editor.update(
      () => {
        const footerNode = $getNodeByKey(nodeKey);
        if (!$isPageFooterNode(footerNode)) return;
        const pageSetupNode = $getPageSetupNode();
        if (!pageSetupNode) return;
        const pageSetup = pageSetupNode.getPageSetup();
        const footers = pageSetup.footers;
        if (!footers.enabled || !pageSetup.isPaged) return;
        const variant = footerNode.getVariant();
        const nextNodes = footerNode.getSerializedChildren();
        const nextFooters: FooterConfig = { ...footers };
        if (variant === 'first') nextFooters.first = nextNodes;
        else if (variant === 'even') nextFooters.even = nextNodes;
        else nextFooters.default = nextNodes;
        pageSetupNode.setFooters(nextFooters);
      },
      {
        discrete: true,
        tag: HISTORIC_TAG,
      },
    );
  }, 500);

  // ==================== PAGE NUMBER SYNC ====================
  const schedulePageNumberUpdate = useCallback(() => {
    if (pageNumberRafIdRef.current !== null) {
      cancelAnimationFrame(pageNumberRafIdRef.current);
    }
    pageNumberRafIdRef.current = requestAnimationFrame(() => {
      editor.update(
        () => {
          $addUpdateTag(SKIP_SCROLL_INTO_VIEW_TAG);
          const root = $getRoot();
          const pages = root.getChildren().filter($isPageNode);
          const totalPages = pages.length;
          pages.forEach((page, index) => {
            page.getAllTextNodes().forEach((textNode) => {
              if ($isPageNumberNode(textNode)) {
                const variant = textNode.getVariant();
                const expectedText = variant === 'current' ? String(index + 1) : String(totalPages);
                if (textNode.getTextContent() !== expectedText) {
                  textNode.setTextContent(expectedText);
                }
              }
            });
          });
        },
        {
          tag: HISTORY_MERGE_TAG,
          discrete: true,
        },
      );
    });
  }, [editor]);

  // ==================== LIFECYCLE ====================
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ==================== MAIN PLUGIN REGISTRATIONS ====================
  useEffect(() => {
    if (!editor.hasNodes([PageNode])) {
      throw new Error('PaginationPlugin: PageNode is not registered on editor');
    }
    if (!editor.hasNodes([PageBreakNode])) {
      throw new Error('PaginationPlugin: PageBreakNode is not registered on editor');
    }

    const rootElement = editor.getRootElement();
    if (!rootElement) return;

    const rootObserver = new ResizeObserver(updateZoom);

    const pageObserver = new ResizeObserver((entries) => {
      const pageContent = entries[0].target as HTMLElement;
      const isPaged = document.documentElement.dataset.paged === 'true';
      if (!isPaged) return;
      editor.read(() => {
        const pageNode = $getNearestNodeFromDOMNode(pageContent);
        if (!$isPageNode(pageNode)) return;
        pageNode.markForMeasurement();
        schedulePageMeasurement();
      });
    });

    rootObserver.observe(rootElement);

    const enforcePageStructure = () => {
      const isEditable = editor.isEditable();
      if (!isEditable) return;
      const root = $getRoot();
      const children = root.getChildren();
      const isPageStructureInvalid =
        !children.some($isPageNode) ||
        children.some(
          (child) => !$isPageNode(child) && !$isPageBreakNode(child) && !$isPageSetupNode(child),
        );
      setIsPageStructureInvalid(isPageStructureInvalid);
    };

    const ensurePageNodeChildren = (pageNode: PageNode) => {
      const children = pageNode.getChildren();
      let header = children.find($isPageHeaderNode);
      let content = children.find($isPageContentNode);
      let footer = children.find($isPageFooterNode);
      const strayChildren = children.filter(
        (child) =>
          !$isPageHeaderNode(child) && !$isPageContentNode(child) && !$isPageFooterNode(child),
      );
      if (header && content && footer && !strayChildren.length) return;
      if (!header) {
        header = $createPageHeaderNode();
      }
      if (!content) {
        content = $createPageContentNode();
        content.append(...strayChildren);
      } else {
        content.append(...strayChildren);
      }
      if (!footer) {
        footer = $createPageFooterNode();
      }
      pageNode.clear();
      pageNode.append(header, content, footer);
    };

    // ==================== NODE TRANSFORMS ====================
    const removePageTransform = editor.registerNodeTransform(PageNode, (pageNode) => {
      ensurePageNodeChildren(pageNode);
      if (!isTouchedRef.current) return;
      const pageSetupNode = $getPageSetupNode();
      if (!pageSetupNode) return;
      const isPaged = pageSetupNode.isPaged();
      if (!isPaged) return;
      if (pageNode.isMarkedForMeasurement()) return;
      pageNode.markForMeasurement();
      schedulePageMeasurement();
    });

    const removeRootTransform = editor.registerNodeTransform(RootNode, enforcePageStructure);

    const removePageContentTransform = editor.registerNodeTransform(PageContentNode, (node) => {
      if (!isTouchedRef.current) return;
      const pageSetupNode = $getPageSetupNode();
      if (!pageSetupNode) return;
      const isPaged = pageSetupNode.isPaged();
      if (!isPaged) return;
      const pageNode = node.getParent();
      if (!$isPageNode(pageNode)) return;
      if (pageNode.isMarkedForMeasurement()) return;
      pageNode.markForMeasurement();
      schedulePageMeasurement();
    });

    // Header/Footer transforms to ensure they have at least one child
    const removePageHeaderTransform = editor.registerNodeTransform(PageHeaderNode, (node) => {
      const pageSetupNode = $getPageSetupNode();
      if (!pageSetupNode) return;
      const { isPaged, headers } = pageSetupNode.getPageSetup();
      if (!isPaged || !headers.enabled) return;
      if (node.getChildrenSize()) return;
      node.append($createParagraphNode());
    });

    const removePageFooterTransform = editor.registerNodeTransform(PageFooterNode, (node) => {
      const pageSetupNode = $getPageSetupNode();
      if (!pageSetupNode) return;
      const { isPaged, footers } = pageSetupNode.getPageSetup();
      if (!isPaged || !footers.enabled) return;
      if (node.getChildrenSize()) return;
      node.append($createParagraphNode());
    });

    // ==================== NAVIGATION COMMANDS ====================
    const $onEscapeLeft = () => {
      const selection = $getSelection();
      if (
        !$isRangeSelection(selection) ||
        !selection.isCollapsed() ||
        selection.anchor.offset !== 0
      ) {
        return false;
      }
      const anchorNode = selection.anchor.getNode();
      const nearestRoot =
        anchorNode.getKey() === 'root' ? anchorNode : $getNearestRootOrShadowRoot(anchorNode);
      if (!$isPageContentNode(nearestRoot)) return false;
      const firstDescendant = nearestRoot.getFirstDescendant();
      if (!firstDescendant || selection.anchor.key !== firstDescendant.getKey()) return false;
      const previousPage = nearestRoot.getPageNode().getPreviousPage();
      if (previousPage) return previousPage.getFooterNode().selectStart() && false;
      const currentPageHeader = nearestRoot.getPageNode().getHeaderNode();
      if (currentPageHeader) currentPageHeader.setEditable(true);

      return true;
    };

    const $onEscapeRight = () => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
        return false;
      }
      const anchorNode = selection.anchor.getNode();
      const anchorTextSize = anchorNode.getTextContentSize();
      if (selection.anchor.offset !== anchorTextSize) return false;
      const nearestRoot =
        anchorNode.getKey() === 'root' ? anchorNode : $getNearestRootOrShadowRoot(anchorNode);
      if (!$isPageContentNode(nearestRoot)) return false;
      const lastDescendant = nearestRoot.getLastDescendant();
      if (!lastDescendant || selection.anchor.key !== lastDescendant.getKey()) return false;
      const nextPage = nearestRoot.getPageNode().getNextPage();
      if (nextPage) return nextPage.getHeaderNode().selectEnd() && false;
      const currentPageFooter = nearestRoot.getPageNode().getFooterNode();
      if (currentPageFooter) currentPageFooter.setEditable(true);
      return true;
    };

    // ==================== COMMAND REGISTRATIONS ====================
    const removeCommandListeners = mergeRegister(
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          isTouchedRef.current = true;
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return false;
          const anchorNode = selection.anchor.getNode();
          const nearestRoot =
            anchorNode.getKey() === 'root' ? anchorNode : $getNearestRootOrShadowRoot(anchorNode);
          const root = $getRoot();
          const children = root.getChildren();
          const pages = children.filter((child) => $isPageNode(child));
          const pageHeaders = pages.map((page) => page.getHeaderNode());
          const pageFooters = pages.map((page) => page.getFooterNode());
          const nearestHeader = $getNearestNodeOfType(nearestRoot, PageHeaderNode);
          if (nearestHeader) nearestHeader.setEditable(true);
          else pageHeaders.forEach((header) => header.setEditable(false));
          const nearestFooter = $getNearestNodeOfType(nearestRoot, PageFooterNode);
          if (nearestFooter) nearestFooter.setEditable(true);
          else pageFooters.forEach((footer) => footer.setEditable(false));
          if (!$isPageContentNode(nearestRoot)) return false;
          const currentPage = nearestRoot.getPageNode();
          const currentPageKey = currentPage.getKey();
          const previousPageKey = previousPageKeyRef.current;
          const pageContentElement = currentPage.getPageContentElement();
          if (!isHTMLElement(pageContentElement)) return false;
          previousPageKeyRef.current = currentPageKey;
          pageObserver.observe(pageContentElement);
          if (previousPageKey === null) return false;
          if (previousPageKey === currentPageKey) return false;
          const previousPage = $getNodeByKey(previousPageKey);
          if (!$isPageNode(previousPage)) return false;
          const previousPageContent = previousPage.getPageContentElement();
          if (!isHTMLElement(previousPageContent)) return false;
          pageObserver.unobserve(previousPageContent);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(KEY_ARROW_LEFT_COMMAND, $onEscapeLeft, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_ARROW_RIGHT_COMMAND, $onEscapeRight, COMMAND_PRIORITY_LOW),
      editor.registerCommand(
        DELETE_CHARACTER_COMMAND,
        (isBackward: boolean) => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            return false;
          }

          const anchorNode = selection.anchor.getNode();
          const nearestRoot =
            anchorNode.getKey() === 'root' ? anchorNode : $getNearestRootOrShadowRoot(anchorNode);
          if (!$isPageContentNode(nearestRoot)) return false;

          const contentChildrenSize = nearestRoot.getChildrenSize() ?? 0;
          const isEmpty =
            contentChildrenSize === 1 && (nearestRoot.getTextContentSize() ?? 0) === 0;
          if (isEmpty && isBackward) {
            const previousPage = nearestRoot.getPageNode().getPreviousPage();
            if (!previousPage) return false;
            nearestRoot.remove();
            previousPage.getContentNode().selectEnd().deleteCharacter(false);
            return true;
          }

          if (isBackward && selection.anchor.offset === 0) {
            const topLevelElement = anchorNode.getTopLevelElement();
            if (topLevelElement === null) return false;
            const indexWithinParent = topLevelElement.getIndexWithinParent();
            if (indexWithinParent !== 0) return false;
            const previousSibling = nearestRoot.getPageNode().getPreviousSibling();
            if (!$isPageNode(previousSibling)) return false;
            previousSibling.getContentNode().append(topLevelElement);
            topLevelElement.selectStart().deleteCharacter(true);
            return true;
          } else if (!isBackward && selection.anchor.offset === anchorNode.getTextContentSize()) {
            const topLevelElement = anchorNode.getTopLevelElement();
            if (topLevelElement === null) return false;
            const indexWithinParent = topLevelElement.getIndexWithinParent();
            if (indexWithinParent !== contentChildrenSize - 1) return false;
            const nextSibling = nearestRoot.getPageNode().getNextSibling();
            if (!$isPageNode(nextSibling)) return false;
            const nextPageContent = nextSibling.getContentNode();
            const nextPageFirstChild = nextPageContent.getFirstChild();
            if (!nextPageFirstChild) return false;
            nearestRoot.append(nextPageFirstChild);
            nextPageFirstChild.selectStart().deleteCharacter(true);
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      // Page break command
      editor.registerCommand(
        INSERT_PAGE_BREAK,
        () => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return false;
          const pageNode = $createPageNode();
          pageNode.getContentNode().append($createParagraphNode());
          const root = $getRoot();
          const focusNode = selection.focus.getNode();
          if (!focusNode) return !!root.append($createPageBreakNode(), pageNode).selectEnd();
          const nearestPage = $getNearestNodeOfType(focusNode, PageNode);
          if (!nearestPage) return !!root.append($createPageBreakNode(), pageNode).selectEnd();
          const nextPage = nearestPage.getNextPage();
          if (nextPage) {
            nextPage.insertBefore($createPageBreakNode());
          }
          return !!nearestPage
            .insertAfter($createPageBreakNode())
            .insertAfter(pageNode)
            .selectEnd();
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      // Page number command
      editor.registerCommand(
        INSERT_PAGE_NUMBER_COMMAND,
        (variant) => {
          const pageNumberNode = $createPageNumberNode(variant);
          $insertNodes([pageNumberNode]);
          if ($isRootNode(pageNumberNode.getParentOrThrow())) {
            $wrapNodeInElement(pageNumberNode, $createParagraphNode);
          }
          const pageNumber =
            variant === 'total' ? pageNumberNode.getTotalPages() : pageNumberNode.getPageNumber();
          pageNumberNode.setTextContent(String(pageNumber));
          pageNumberNode.selectEnd();
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    );

    // ==================== MUTATION LISTENERS ====================
    const removeMutationListeners = mergeRegister(
      // PageSetup mutations -> sync headers and footers
      editor.registerMutationListener(PageSetupNode, () => {
        syncHeadersFromPageSetup();
        syncFootersFromPageSetup();
      }),
      // PageHeader mutations
      editor.registerMutationListener(PageHeaderNode, (mutations) => {
        if (
          mutations.values().some((mutation) => mutation === 'created' || mutation === 'destroyed')
        ) {
          syncHeadersFromPageSetup();
        }
      }),
      // PageFooter mutations
      editor.registerMutationListener(PageFooterNode, (mutations) => {
        if (
          mutations.values().some((mutation) => mutation === 'created' || mutation === 'destroyed')
        ) {
          syncFootersFromPageSetup();
        }
      }),
      // PageNumber mutations
      editor.registerMutationListener(PageNumberNode, (mutations) => {
        if (mutations.values().some((m) => m === 'created' || m === 'destroyed')) {
          schedulePageNumberUpdate();
        }
      }),
    );

    // ==================== UPDATE LISTENER FOR HEADER/FOOTER SYNC ====================
    const removeUpdateListener = editor.registerUpdateListener(
      ({ editorState, prevEditorState, dirtyElements, dirtyLeaves, tags }) => {
        if (tags.has(HISTORIC_TAG) || tags.has(HISTORY_MERGE_TAG)) return;

        // Check for header mutations
        const mutatedHeaders = editorState.read(() =>
          dirtyElements
            .keys()
            .filter((key) => $isPageHeaderNode($getNodeByKey(key)))
            .toArray(),
        );
        if (mutatedHeaders.length > 0) {
          const isDirtyLeafOutsideHeader =
            prevEditorState.read(() => {
              const headerNode = $getNodeByKey<PageHeaderNode>(mutatedHeaders[0]);
              if (!headerNode) return false;
              return dirtyLeaves.values().some((key) => {
                const node = $getNodeByKey(key);
                if (!node) return false;
                return !headerNode.isParentOf(node);
              });
            }) ||
            editorState.read(() => {
              const headerNode = $getNodeByKey<PageHeaderNode>(mutatedHeaders[0]);
              if (!headerNode) return false;
              return dirtyLeaves.values().some((key) => {
                const node = $getNodeByKey(key);
                if (!node) return false;
                return !headerNode.isParentOf(node);
              });
            });
          if (!isDirtyLeafOutsideHeader) {
            mutatedHeaderKeyRef.current = mutatedHeaders[0];
            syncHeadersToPageSetup(mutatedHeaderKeyRef.current);
          }
        }

        // Check for footer mutations
        const mutatedFooters = editorState.read(() =>
          dirtyElements
            .keys()
            .filter((key) => $isPageFooterNode($getNodeByKey(key)))
            .toArray(),
        );
        if (mutatedFooters.length > 0) {
          const isDirtyLeafOutsideFooter =
            prevEditorState.read(() => {
              const footerNode = $getNodeByKey<PageFooterNode>(mutatedFooters[0]);
              if (!footerNode) return false;
              return dirtyLeaves.values().some((key) => {
                const node = $getNodeByKey(key);
                if (!node) return false;
                return !footerNode.isParentOf(node);
              });
            }) ||
            editorState.read(() => {
              const footerNode = $getNodeByKey<PageFooterNode>(mutatedFooters[0]);
              if (!footerNode) return false;
              return dirtyLeaves.values().some((key) => {
                const node = $getNodeByKey(key);
                if (!node) return false;
                return !footerNode.isParentOf(node);
              });
            });
          if (!isDirtyLeafOutsideFooter) {
            mutatedFooterKeyRef.current = mutatedFooters[0];
            syncFootersToPageSetup(mutatedFooterKeyRef.current);
          }
        }
      },
    );

    return () => {
      rootObserver.disconnect();
      isTouchedRef.current = false;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (headerRafIdRef.current !== null) {
        cancelAnimationFrame(headerRafIdRef.current);
      }
      if (footerRafIdRef.current !== null) {
        cancelAnimationFrame(footerRafIdRef.current);
      }
      if (pageNumberRafIdRef.current !== null) {
        cancelAnimationFrame(pageNumberRafIdRef.current);
      }
      PageNode.clearMeasurementFlags();
      removeCommandListeners();
      removePageTransform();
      removeRootTransform();
      removePageContentTransform();
      removePageHeaderTransform();
      removePageFooterTransform();
      removeMutationListeners();
      removeUpdateListener();
    };
  }, [
    editor,
    schedulePageMeasurement,
    syncHeadersFromPageSetup,
    syncHeadersToPageSetup,
    syncFootersFromPageSetup,
    syncFootersToPageSetup,
    schedulePageNumberUpdate,
    updateZoom,
  ]);

  // ==================== PAGE STRUCTURE FIX ====================
  const fixPageStructure = useCallback(() => {
    editor.update(
      () => {
        const root = $getRoot();
        const children = root.getChildren();
        const pages = [] as Array<PageNode | PageBreakNode | PageSetupNode>;
        children.forEach((child) => {
          if ($isPageNode(child)) {
            pages.push(child);
          } else if ($isPageBreakNode(child) || $isPageSetupNode(child)) {
            pages.push(child);
          } else {
            const lastPage = pages[pages.length - 1];
            if ($isPageNode(lastPage)) {
              lastPage.getContentNode().append(child);
            } else {
              const newPage = $createPageNode();
              newPage.getContentNode().append(child);
              pages.push(newPage);
            }
          }
        });
        root.clear();
        root.append(...pages);
        pages.forEach((page) => {
          if (!$isPageNode(page)) return;
          page.markForMeasurement();
        });
        if (!pages.some($isPageNode)) {
          const newPage = $createPageNode();
          const paragraph = $createParagraphNode();
          newPage.getContentNode().append(paragraph);
          root.append(newPage);
          paragraph.selectStart();
          newPage.markForMeasurement();
        }
        isTouchedRef.current = true;
        schedulePageMeasurement();
      },
      {
        discrete: true,
        tag: HISTORIC_TAG,
        onUpdate() {
          setIsPageStructureInvalid(false);
        },
      },
    );
  }, [editor, schedulePageMeasurement]);

  const resizePages = useCallback(() => {
    editor.read(() => {
      const root = $getRoot();
      const children = root.getChildren();
      PageNode.clearMeasurementFlags();
      const pages = children.filter((child) => $isPageNode(child));
      pages.forEach((page) => page.markForMeasurement());
      isTouchedRef.current = true;
      schedulePageMeasurement();
    });
  }, [editor, schedulePageMeasurement]);

  useEffect(() => {
    return editor.registerMutationListener(PageSetupNode, (mutations) => {
      mutations.forEach((mutation) => {
        if (mutation !== 'updated') return;
        const isPaged = editor.read(() => {
          const pageSetupNode = $getPageSetupNode();
          if (!pageSetupNode) return false;
          return pageSetupNode.isPaged();
        });
        if (!isPaged) return;
        resizePages();
      });
    });
  }, [editor, resizePages]);

  useEffect(() => {
    if (!isPageStructureInvalid) return;
    fixPageStructure();
  }, [isPageStructureInvalid, fixPageStructure]);

  const [isPageSetupMissing, setIsPageSetupMissing] = useState(false);

  const createPageSetupNode = useCallback(() => {
    const isEditable = editor.isEditable();
    if (!isEditable) return;
    editor.update(
      () => {
        const root = $getRoot();
        const firstChild = root.getFirstChild();
        if (!firstChild) return;
        if ($isPageSetupNode(firstChild)) return;
        const pageSetupNode = $createPageSetupNode();
        firstChild.insertBefore(pageSetupNode);
      },
      {
        discrete: true,
        tag: HISTORY_MERGE_TAG,
        onUpdate() {
          setIsPageSetupMissing(false);
        },
      },
    );
  }, [editor]);

  useEffect(() => {
    if (!isPageSetupMissing) return;
    createPageSetupNode();
  }, [isPageSetupMissing, createPageSetupNode]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          const root = $getRoot();
          const firstChild = root.getFirstChild();
          if (!firstChild) return;
          if ($isPageSetupNode(firstChild)) return;
          setIsPageSetupMissing(true);
        });
      }),
      editor.registerMutationListener(PageSetupNode, (mutations) => {
        mutations.forEach(() => {
          editor.getEditorState().read(() => {
            const node = $getPageSetupNode();
            if (!node) return;
            const pageSetup = node.getPageSetup();
            updateEditorStoreState('pageSetup', pageSetup);
          });
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return false;
          const anchorNode = selection.anchor.getNode();
          if (!$isRootNode(anchorNode)) return false;
          const firstPage = anchorNode.getFirstChild()?.getNextSibling();
          if (!$isPageNode(firstPage)) return false;
          const pageContentKey = firstPage.getContentNode().getKey();
          if (selection.anchor.offset === 0) {
            selection.anchor.set(pageContentKey, 0, 'element');
          }
          return false;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    );
  }, [editor, updateEditorStoreState]);

  return null;
}
