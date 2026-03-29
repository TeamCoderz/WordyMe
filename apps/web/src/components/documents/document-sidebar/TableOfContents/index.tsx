/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { TableOfContentsEntry } from '@repo/editor/plugins/TableOfContentsPlugin';
import type { NodeKey } from '@repo/editor/types';
import type { JSX } from 'react';

import { TableOfContentsPlugin } from '@repo/editor/plugins/TableOfContentsPlugin';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@repo/ui/lib/utils';
import { decodeId } from '@repo/lib/utils/id';
import { TableOfContentsIcon } from '@repo/ui/components/icons';
import { useDebounce } from '@repo/ui/hooks/use-debounce';
import { useLexicalComposerContext } from '@repo/editor/lexical';
import { useRouteContext } from '@tanstack/react-router';
import { useSelector } from '@/store';

export function TableOfContentsList({
  tableOfContents,
}: {
  tableOfContents: Array<TableOfContentsEntry>;
}): JSX.Element {
  const [selectedKey, setSelectedKey] = useState('');
  const { tabId } = useRouteContext({ from: '__root__' });
  const hash = useSelector((state) => state.tabs.tabList.find((tab) => tab.id === tabId)?.hash);
  const observersRef = useRef<Map<string, IntersectionObserver>>(new Map());
  const shouldObserveRef = useRef(true);
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Clean up previous observers
    observersRef.current.forEach((observer) => observer.disconnect());
    observersRef.current.clear();

    if (tableOfContents.length === 0) return;
    // Set up intersection observers for each heading
    const headingElements = tableOfContents
      .map(([key]) => {
        const element = editor.getElementByKey(key);
        if (!element) return null;
        return { key, element };
      })
      .filter(Boolean) as Array<{ key: NodeKey; element: HTMLElement }>;

    const handleIntersection: IntersectionObserverCallback = (entries, _observer) => {
      if (!shouldObserveRef.current) return;
      // Find the first visible heading
      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => {
          // Sort by intersection ratio as primary criteria
          if (b.intersectionRatio !== a.intersectionRatio) {
            return b.intersectionRatio - a.intersectionRatio;
          }
          // If intersection ratios are equal, sort by position
          return a.boundingClientRect.top - b.boundingClientRect.top;
        });

      if (visibleEntries.length > 0) {
        const target = visibleEntries[0].target;
        const key = headingElements.find(({ element }) => element === target)?.key;
        if (key) setSelectedKey(key);
      }
    };

    // Create a single intersection observer for all headings
    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin: '-140px 0px -100% 0px',
      threshold: [0, 0.25, 0.5, 0.75, 1], // Multiple thresholds for better precision
    });

    // Observe all heading elements
    headingElements.forEach(({ element }) => {
      observer.observe(element);
    });

    requestAnimationFrame(() => {
      const hash = window.location.hash;
      if (hash.length > 1) return;
      const firstVisibleHeading = headingElements
        .map(({ key, element }) => ({
          key,
          rect: element.getBoundingClientRect(),
        }))
        .filter(({ rect }) => rect.bottom > 0 && rect.top < window.innerHeight)
        .sort((a, b) => a.rect.top - b.rect.top)[0];

      if (firstVisibleHeading) {
        shouldObserveRef.current = false;
        setSelectedKey(firstVisibleHeading.key);
        setTimeout(() => {
          shouldObserveRef.current = true;
        }, 1000);
      }
    });

    observersRef.current.set('headings', observer);

    return () => {
      observer.disconnect();
      observersRef.current.clear();
    };
  }, [editor, tableOfContents]);

  useEffect(() => {
    if (!hash) return;
    if (tableOfContents.length === 0) return;
    if (hash.length < 1) return;
    shouldObserveRef.current = false;
    const id = decodeId(hash);
    const key = tableOfContents.find(([, , , _id]) => id === _id)?.[0];
    if (!key) return;
    requestAnimationFrame(() => {
      setSelectedKey(key);
      const element = editor.getElementByKey(key);
      if (!element) return;
      element.scrollIntoView({ block: 'start' });
    });
    setTimeout(() => {
      shouldObserveRef.current = true;
    }, 1000);
  }, [editor, hash, tableOfContents]);

  const minDepth = tableOfContents.reduce(
    (min, [, , tag]) => Math.min(min, parseInt(tag.slice(1))),
    Infinity,
  );

  return (
    <div className="flex flex-col text-sm text-muted-foreground p-3 h-full">
      {tableOfContents.map((item, index) => {
        const [key, text, tag, id] = item;
        const active = selectedKey === key;
        const depth = parseInt(tag.slice(1)) - minDepth;
        const padding = depth * 0.75 + 0.25;
        const url = `#${id}`;
        return (
          <a
            key={`${url}-${index}`}
            href={url}
            className={cn('cursor-pointer py-1.5 hover:text-accent-foreground shrink-0 truncate', {
              'text-cyan-700': active,
              'text-muted-foreground': !active,
            })}
            ref={(el) => {
              if (el && active) {
                el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
              }
            }}
            style={{
              paddingInlineStart: `${padding}rem`,
            }}
          >
            {text}
          </a>
        );
      })}
    </div>
  );
}

const TableOfContentsListMemo = ({
  tableOfContents,
}: {
  tableOfContents: Array<TableOfContentsEntry>;
}) => {
  const [debouncedTableOfContents] = useDebounce(tableOfContents, 300);
  const hasLengthChanged = debouncedTableOfContents.length !== tableOfContents.length;
  return (
    <TableOfContentsList
      tableOfContents={hasLengthChanged ? tableOfContents : debouncedTableOfContents}
    />
  );
};

export function TableOfContents() {
  return (
    <TableOfContentsPlugin>
      {(tableOfContents) => {
        return <TableOfContentsListMemo tableOfContents={tableOfContents} />;
      }}
    </TableOfContentsPlugin>
  );
}

export function TableOfContentsHeader() {
  return (
    <div className="flex items-center gap-2 p-4 shrink-0 truncate">
      <TableOfContentsIcon className="size-4" />
      Table of Contents
    </div>
  );
}
