/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
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
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  LexicalCommand,
  NodeKey,
  RootNode,
  SELECTION_CHANGE_COMMAND,
  SKIP_SCROLL_INTO_VIEW_TAG,
} from 'lexical';
import { useCallback, useEffect, useRef } from 'react';
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
  HeaderConfig,
  FooterConfig,
  $isPageNumberNode,
  $createPageNumberNode,
  PageNumberNode,
  PageNumberVariant,
  PAGE_SETUP_TAG,
} from '@repo/editor/nodes/PageNode';
import {
  $createPageBreakNode,
  $isPageBreakNode,
  PageBreakNode,
} from '@repo/editor/nodes/PageBreakNode';
import { useActions } from '@repo/editor/store';
import { useDebouncedCallback } from '@repo/ui/hooks/use-debounce';

export const INSERT_PAGE_BREAK: LexicalCommand<undefined> = createCommand('INSERT_PAGE_BREAK');
export const INSERT_PAGE_NUMBER_COMMAND: LexicalCommand<PageNumberVariant> = createCommand(
  'INSERT_PAGE_NUMBER_COMMAND',
);

type RafTask = 'measurement' | 'header' | 'footer' | 'pageNumber';

export default function PaginationPlugin() {
  const [editor] = useLexicalComposerContext();
  const isMountedRef = useRef(false);
  const isTouchedRef = useRef(false);

  const rafIdsRef = useRef<Map<RafTask, number>>(new Map());

  const previousPageKeyRef = useRef<NodeKey | null>(null);
  const mutatedHeaderKeyRef = useRef<NodeKey | null>(null);
  const mutatedFooterKeyRef = useRef<NodeKey | null>(null);
  const selectedHeaderOrFooterKeyRef = useRef<NodeKey | null>(null);

  const { updateEditorStoreState } = useActions();

  const scheduleRaf = useCallback((task: RafTask, callback: () => void) => {
    const existingId = rafIdsRef.current.get(task);
    if (existingId !== undefined) {
      cancelAnimationFrame(existingId);
    }
    const newId = requestAnimationFrame(() => {
      rafIdsRef.current.delete(task);
      callback();
    });
    rafIdsRef.current.set(task, newId);
  }, []);

  const cancelAllRaf = useCallback(() => {
    rafIdsRef.current.forEach((id) => cancelAnimationFrame(id));
    rafIdsRef.current.clear();
  }, []);

  const updateZoom = useCallback(() => {
    const rootElement = editor.getRootElement();
    if (!rootElement) return;
    const PAGE_WIDTH = parseInt(document.documentElement.style.getPropertyValue('--page-width'));
    if (!PAGE_WIDTH) return;
    const prevZoom = rootElement.style.zoom || '1';
    const rootWidth = rootElement.getBoundingClientRect().width;
    const rootPadding = parseFloat(getComputedStyle(rootElement).paddingLeft) * 2;
    const nextZoom = Math.min(rootWidth / (PAGE_WIDTH + rootPadding), 1).toFixed(6);
    if (nextZoom === prevZoom) return;
    rootElement.style.zoom = nextZoom;
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

  const schedulePageMeasurement = useCallback(() => {
    scheduleRaf('measurement', () => {
      editor.update(
        () => {
          $addUpdateTag(SKIP_SCROLL_INTO_VIEW_TAG);
          const root = $getRoot();
          const children = root.getChildren();
          for (const child of children) {
            if ($isPageNode(child) && child.isMarkedForMeasurement()) {
              child.fixFlow();
            }
          }
        },
        { tag: HISTORIC_TAG },
      );
    });
  }, [editor, scheduleRaf]);

  const syncHeadersFromPageSetup = useCallback(() => {
    scheduleRaf('header', () => {
      editor.update(
        () => {
          $addUpdateTag(SKIP_SCROLL_INTO_VIEW_TAG);
          const pageSetupNode = $getPageSetupNode();
          if (!pageSetupNode) return;
          const { headers, isPaged } = pageSetupNode.getPageSetup();
          const headerChecksums = pageSetupNode.getHeaderChecksums();
          const mutatedKey = mutatedHeaderKeyRef.current;

          for (const child of $getRoot().getChildren()) {
            if (!$isPageNode(child)) continue;
            const headerNode = child.getHeaderNode();

            if (!headers.enabled || !isPaged) {
              headerNode.hide();
              continue;
            }
            headerNode.show();
            if (headerNode.isDirty() || headerNode.getKey() === mutatedKey) continue;

            const variant = headerNode.getVariant();
            const nextChecksum = headerChecksums[variant];
            if (headerNode.getChecksum() === nextChecksum) continue;
            headerNode.updateVariant();
          }
        },
        {
          tag: HISTORY_MERGE_TAG,
          discrete: true,
        },
      );
    });
  }, [editor, scheduleRaf]);

  const syncHeadersToPageSetup = useDebouncedCallback((nodeKey: NodeKey) => {
    editor.update(
      () => {
        $addUpdateTag(PAGE_SETUP_TAG);
        const headerNode = $getNodeByKey(nodeKey);
        if (!$isPageHeaderNode(headerNode)) return;
        const pageSetupNode = $getPageSetupNode();
        if (!pageSetupNode) return;
        const { headers, isPaged } = pageSetupNode.getPageSetup();
        if (!headers.enabled || !isPaged) return;
        const variant = headerNode.getVariant();
        const nextNodes = headerNode.getSerializedChildren();
        const nextHeaders: Partial<HeaderConfig> = {};
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

  const syncFootersFromPageSetup = useCallback(() => {
    scheduleRaf('footer', () => {
      editor.update(
        () => {
          $addUpdateTag(SKIP_SCROLL_INTO_VIEW_TAG);
          const pageSetupNode = $getPageSetupNode();
          if (!pageSetupNode) return;
          const { footers, isPaged } = pageSetupNode.getPageSetup();
          const footerChecksums = pageSetupNode.getFooterChecksums();
          const mutatedKey = mutatedFooterKeyRef.current;

          for (const child of $getRoot().getChildren()) {
            if (!$isPageNode(child)) continue;
            const footerNode = child.getFooterNode();

            if (!footers.enabled || !isPaged) {
              footerNode.hide();
              continue;
            }
            footerNode.show();
            if (footerNode.isDirty() || footerNode.getKey() === mutatedKey) continue;

            const variant = footerNode.getVariant();
            const nextChecksum = footerChecksums[variant];
            if (footerNode.getChecksum() === nextChecksum) continue;
            footerNode.updateVariant();
          }
        },
        {
          tag: HISTORY_MERGE_TAG,
          discrete: true,
        },
      );
    });
  }, [editor, scheduleRaf]);

  const syncFootersToPageSetup = useDebouncedCallback((nodeKey: NodeKey) => {
    editor.update(
      () => {
        $addUpdateTag(PAGE_SETUP_TAG);
        const footerNode = $getNodeByKey(nodeKey);
        if (!$isPageFooterNode(footerNode)) return;
        const pageSetupNode = $getPageSetupNode();
        if (!pageSetupNode) return;
        const { footers, isPaged } = pageSetupNode.getPageSetup();
        if (!footers.enabled || !isPaged) return;
        const variant = footerNode.getVariant();
        const nextNodes = footerNode.getSerializedChildren();
        const nextFooters: Partial<FooterConfig> = {};
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

  const schedulePageNumberUpdate = useCallback(() => {
    scheduleRaf('pageNumber', () => {
      editor.update(
        () => {
          $addUpdateTag(SKIP_SCROLL_INTO_VIEW_TAG);
          const root = $getRoot();
          const pages = root.getChildren().filter($isPageNode);
          const totalPages = pages.length;
          if (totalPages === 0) return;
          const totalStr = String(totalPages);

          for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
            const page = pages[pageIndex];
            const currentStr = String(pageIndex + 1);
            const headerTextNodes = page.getHeaderNode().getAllTextNodes();
            const footerTextNodes = page.getFooterNode().getAllTextNodes();
            const textNodes = headerTextNodes.concat(footerTextNodes);
            for (const textNode of textNodes) {
              if ($isPageNumberNode(textNode)) {
                const expectedText = textNode.getVariant() === 'current' ? currentStr : totalStr;
                textNode.setTextContent(expectedText);
              }
            }
          }
        },
        {
          tag: HISTORY_MERGE_TAG,
          discrete: true,
        },
      );
    });
  }, [editor, scheduleRaf]);

  const fixPageStructure = useCallback(() => {
    editor.update(
      () => {
        const root = $getRoot();
        const children = root.getChildren();
        const pages = [] as Array<PageNode | PageBreakNode | PageSetupNode>;
        if (!$isPageSetupNode(children[0])) {
          children[0].insertBefore($createPageSetupNode());
          return;
        }
        for (const child of children) {
          if ($isPageNode(child)) {
            pages.push(child);
          } else if ($isPageBreakNode(child) || $isPageSetupNode(child)) {
            pages.push(child);
          } else {
            const lastPage = pages[pages.length - 1];
            if ($isPageNode(lastPage)) {
              lastPage.getContentNode().append(child);
            } else {
              const newPage = $createPageNode(1);
              newPage.getContentNode().append(child);
              pages.push(newPage);
            }
          }
        }
        root.clear();
        root.append(...pages);
        for (const page of pages) {
          if ($isPageNode(page)) {
            page.markForMeasurement();
          }
        }
        if (!pages.some($isPageNode)) {
          const newPage = $createPageNode(1);
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
      },
    );
  }, [editor, schedulePageMeasurement]);

  const resizePages = useCallback(() => {
    editor.read(() => {
      const root = $getRoot();
      const children = root.getChildren();
      PageNode.clearMeasurementFlags();
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (!$isPageNode(child)) continue;
        if ($isPageNode(child.getPreviousSibling())) continue;
        child.markForMeasurement();
        const nextSibling = child.getNextSibling();
        if (!$isPageNode(nextSibling)) continue;
        nextSibling.markForMeasurement();
        const nextSiblingNextSibling = nextSibling.getNextSibling();
        if (!$isPageNode(nextSiblingNextSibling)) continue;
        nextSiblingNextSibling.markForMeasurement();
      }
      isTouchedRef.current = true;
      schedulePageMeasurement();
    });
  }, [editor, schedulePageMeasurement]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
        const pageContentNode = $getNearestNodeFromDOMNode(pageContent);
        if (!$isPageContentNode(pageContentNode)) return;
        const pageNode = pageContentNode.getParent();
        if (!$isPageNode(pageNode)) return;
        const previousPage = pageNode.getPreviousPage();
        if (previousPage) previousPage.markForMeasurement();
        pageNode.markForMeasurement();
        const nextPage = pageNode.getNextPage();
        if (nextPage) nextPage.markForMeasurement();
        schedulePageMeasurement();
      });
    });

    rootObserver.observe(rootElement);

    const enforcePageStructure = () => {
      const isEditable = editor.isEditable();
      if (!isEditable) return;
      const root = $getRoot();
      const children = root.getChildren();
      const isInvalid =
        !$isPageSetupNode(children[0]) ||
        !children.some($isPageNode) ||
        children.some(
          (child) => !$isPageNode(child) && !$isPageBreakNode(child) && !$isPageSetupNode(child),
        );
      if (isInvalid) {
        queueMicrotask(fixPageStructure);
      }
    };

    const ensurePageNodeChildren = (pageNode: PageNode) => {
      const children = pageNode.getChildren();
      let header: PageHeaderNode | undefined;
      let content: PageContentNode | undefined;
      let footer: PageFooterNode | undefined;
      const strayChildren: typeof children = [];

      for (const child of children) {
        if ($isPageHeaderNode(child)) {
          header = child;
        } else if ($isPageContentNode(child)) {
          content = child;
        } else if ($isPageFooterNode(child)) {
          footer = child;
        } else {
          strayChildren.push(child);
        }
      }

      if (header && content && footer && strayChildren.length === 0) return;

      if (!header) {
        const headerVariant =
          $getPageSetupNode()?.getHeaders().differentEven && pageNode.getPageNumber() % 2 === 0
            ? 'even'
            : 'default';
        header = $createPageHeaderNode(headerVariant);
      }
      if (!content) {
        content = $createPageContentNode();
      }
      if (strayChildren.length > 0) {
        content.append(...strayChildren);
      }
      if (!footer) {
        const footerVariant =
          $getPageSetupNode()?.getFooters().differentEven && pageNode.getPageNumber() % 2 === 0
            ? 'even'
            : 'default';
        footer = $createPageFooterNode(footerVariant);
      }
      pageNode.clear();
      pageNode.append(header, content, footer);
    };

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
      if (currentPageHeader) {
        $addUpdateTag(HISTORY_MERGE_TAG);
        currentPageHeader.setEditable(true);
      }
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
      if (currentPageFooter) {
        $addUpdateTag(HISTORY_MERGE_TAG);
        currentPageFooter.setEditable(true);
      }
      return true;
    };

    const removeCommandListeners = mergeRegister(
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          isTouchedRef.current = true;
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return false;
          const anchorNode = selection.anchor.getNode();
          if ($isRootNode(anchorNode)) {
            const firstPage = anchorNode.getFirstChild()?.getNextSibling();
            if (!$isPageNode(firstPage)) return false;
            const pageContentKey = firstPage.getContentNode().getKey();
            const isCollapsed = selection.isCollapsed();
            if (selection.anchor.offset === 0) {
              selection.anchor.set(pageContentKey, 0, 'element');
              if (isCollapsed) selection.focus.set(pageContentKey, 0, 'element');
            }
            return false;
          }
          const nearestRoot =
            anchorNode.getKey() === 'root' ? anchorNode : $getNearestRootOrShadowRoot(anchorNode);
          const nearestHeader = $getNearestNodeOfType(nearestRoot, PageHeaderNode);
          const nearestFooter = $getNearestNodeOfType(nearestRoot, PageFooterNode);
          if (nearestHeader && nearestHeader.getKey() !== selectedHeaderOrFooterKeyRef.current) {
            $addUpdateTag(HISTORY_MERGE_TAG);
            nearestHeader.setEditable(true);
            selectedHeaderOrFooterKeyRef.current = nearestHeader.getKey();
          } else if (
            nearestFooter &&
            nearestFooter.getKey() !== selectedHeaderOrFooterKeyRef.current
          ) {
            $addUpdateTag(HISTORY_MERGE_TAG);
            nearestFooter.setEditable(true);
            selectedHeaderOrFooterKeyRef.current = nearestFooter.getKey();
          } else if (!nearestHeader && !nearestFooter && selectedHeaderOrFooterKeyRef.current) {
            const selectedHeaderOrFooter = $getNodeByKey(selectedHeaderOrFooterKeyRef.current);
            if (
              $isPageHeaderNode(selectedHeaderOrFooter) ||
              $isPageFooterNode(selectedHeaderOrFooter)
            ) {
              $addUpdateTag(HISTORY_MERGE_TAG);
              selectedHeaderOrFooter.setEditable(false);
              selectedHeaderOrFooterKeyRef.current = null;
            }
          }
          if (!$isPageContentNode(nearestRoot)) return false;
          const currentPage = nearestRoot.getPageNode();
          const currentPageKey = currentPage.getKey();
          const previousPageKey = previousPageKeyRef.current;
          const pageContentElement = currentPage.getPageContentElement();
          if (!pageContentElement) return false;
          previousPageKeyRef.current = currentPageKey;
          pageObserver.observe(pageContentElement);
          if (previousPageKey === null || previousPageKey === currentPageKey) return false;
          const previousPage = $getNodeByKey(previousPageKey);
          if (!$isPageNode(previousPage)) return false;
          const previousPageContent = previousPage.getPageContentElement();
          if (!previousPageContent) return false;
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
      editor.registerCommand(
        INSERT_PAGE_BREAK,
        () => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return false;
          const root = $getRoot();
          const pageCount = root.getChildren().reduce((count, child) => {
            if ($isPageNode(child)) {
              return count + 1;
            }
            return count;
          }, 0);
          const focusNode = selection.focus.getNode();
          if (!focusNode)
            return !!root
              .append($createPageBreakNode(), $createPageNode(pageCount + 1))
              .selectEnd();
          const nearestPage = $getNearestNodeOfType(focusNode, PageNode);
          if (!nearestPage)
            return !!root
              .append($createPageBreakNode(), $createPageNode(pageCount + 1))
              .selectEnd();
          const nextPage = nearestPage.getNextPage();
          if (nextPage) {
            nextPage.insertBefore($createPageBreakNode());
          }
          const newPage = $createPageNode(nearestPage.getPageNumber() + 1);
          newPage.getContentNode().append($createParagraphNode());
          return !!nearestPage.insertAfter($createPageBreakNode()).insertAfter(newPage).selectEnd();
        },
        COMMAND_PRIORITY_EDITOR,
      ),
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

    const removeMutationListeners = mergeRegister(
      editor.registerMutationListener(PageSetupNode, (mutations) => {
        updatePageDimensions();
        const pageSetup = editor.getEditorState().read(() => {
          const node = $getPageSetupNode();
          if (!node) return null;
          return node.getPageSetup();
        });
        if (!pageSetup) return;
        updateEditorStoreState('pageSetup', pageSetup);
        syncHeadersFromPageSetup();
        syncFootersFromPageSetup();
        const mutation = mutations.values().toArray()[0];
        if (!pageSetup.isPaged || mutation !== 'updated') return;
        resizePages();
      }),
      editor.registerMutationListener(PageNode, (mutations) => {
        if (!isTouchedRef.current) return;
        for (const [key, mutation] of mutations) {
          if (mutation === 'created' || mutation === 'destroyed') {
            PageNode.markForMeasurement(key);
          }
        }
        syncHeadersFromPageSetup();
        syncFootersFromPageSetup();
        schedulePageMeasurement();
      }),
      editor.registerMutationListener(PageNumberNode, (mutations) => {
        for (const mutation of mutations.values()) {
          if (mutation === 'created' || mutation === 'destroyed') {
            schedulePageNumberUpdate();
            break;
          }
        }
      }),
    );

    const removeUpdateListener = editor.registerUpdateListener(
      ({ editorState, prevEditorState, dirtyElements, dirtyLeaves, tags }) => {
        if (tags.has(HISTORIC_TAG) || tags.has(HISTORY_MERGE_TAG)) return;
        if (dirtyElements.size === 0) return;

        let mutatedHeaderKey: NodeKey | null = null;
        let mutatedFooterKey: NodeKey | null = null;

        editorState.read(() => {
          for (const key of dirtyElements.keys()) {
            if (mutatedHeaderKey !== null && mutatedFooterKey !== null) break;
            const node = $getNodeByKey(key);
            if (mutatedHeaderKey === null && $isPageHeaderNode(node)) {
              mutatedHeaderKey = key;
            } else if (mutatedFooterKey === null && $isPageFooterNode(node)) {
              mutatedFooterKey = key;
            }
          }
        });

        const hasDirtyLeafOutside = (
          parentKey: NodeKey,
          isNodeType: (node: ReturnType<typeof $getNodeByKey>) => boolean,
        ): boolean => {
          if (dirtyLeaves.size === 0) return false;

          const currentResult = editorState.read(() => {
            const parentNode = $getNodeByKey(parentKey);
            if (!parentNode || !isNodeType(parentNode)) return null; // inconclusive
            for (const leafKey of dirtyLeaves.values()) {
              const leafNode = $getNodeByKey(leafKey);
              if (leafNode && !parentNode.isParentOf(leafNode)) {
                return true;
              }
            }
            return false;
          });

          if (currentResult !== null) return currentResult;

          return prevEditorState.read(() => {
            const parentNode = $getNodeByKey(parentKey);
            if (!parentNode || !isNodeType(parentNode)) return false;
            for (const leafKey of dirtyLeaves.values()) {
              const leafNode = $getNodeByKey(leafKey);
              if (leafNode && !parentNode.isParentOf(leafNode)) {
                return true;
              }
            }
            return false;
          });
        };

        if (mutatedHeaderKey !== null) {
          if (!hasDirtyLeafOutside(mutatedHeaderKey, $isPageHeaderNode)) {
            mutatedHeaderKeyRef.current = mutatedHeaderKey;
            syncHeadersToPageSetup(mutatedHeaderKey);
          }
        }

        if (mutatedFooterKey !== null) {
          if (!hasDirtyLeafOutside(mutatedFooterKey, $isPageFooterNode)) {
            mutatedFooterKeyRef.current = mutatedFooterKey;
            syncFootersToPageSetup(mutatedFooterKey);
          }
        }
      },
    );

    return () => {
      rootObserver.disconnect();
      pageObserver.disconnect();
      isTouchedRef.current = false;
      cancelAllRaf();
      PageNode.clearMeasurementFlags();
      removeCommandListeners();
      removePageTransform();
      removeRootTransform();
      removePageContentTransform();
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
    cancelAllRaf,
  ]);

  return null;
}
