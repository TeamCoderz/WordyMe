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
import { useHash } from '@repo/ui/hooks/use-hash';
import { decodeId } from '@repo/lib/utils/id';
import { TableOfContentsIcon } from '@repo/ui/components/icons';
import { useDebounce } from '@repo/ui/hooks/use-debounce';

export function TableOfContentsList({
  tableOfContents,
}: {
  tableOfContents: Array<TableOfContentsEntry>;
}): JSX.Element {
  const [selectedKey, setSelectedKey] = useState('');
  const [hash] = useHash();
  const observersRef = useRef<Map<string, IntersectionObserver>>(new Map());
  const shouldObserveRef = useRef(true);

  useEffect(() => {
    // Clean up previous observers
    observersRef.current.forEach((observer) => observer.disconnect());
    observersRef.current.clear();

    if (tableOfContents.length === 0) return;

    // Set up intersection observers for each heading
    const headingElements = tableOfContents
      .map(([key, , , id]) => {
        const element =
          document.getElementById(id) || document.querySelector(`[href="${hash}"][target="_self"]`);
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
  }, [tableOfContents]);

  useEffect(() => {
    if (!hash) return;
    if (tableOfContents.length === 0) return;
    if (hash.length < 2) return;
    shouldObserveRef.current = false;
    const id = hash.slice(1);
    const decodedId = decodeId(id);
    const key = tableOfContents.find(([, , , _id]) => decodedId === _id)?.[0];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (key) setSelectedKey(key);
    const scrollIntoView = () => {
      const target = document.getElementById(decodedId);
      if (target) return target.scrollIntoView({ block: 'start' });
      const anchor = Array.from(document.getElementsByTagName('a')).find(
        (a) => a.getAttribute('href') === `#${decodedId}` && a.getAttribute('target') === '_self',
      );
      anchor?.scrollIntoView({ block: 'start' });
    };
    scrollIntoView();
    setTimeout(() => {
      shouldObserveRef.current = true;
    }, 1000);
  }, [hash, tableOfContents]);

  const minDepth = tableOfContents.reduce(
    (min, [, , tag]) => Math.min(min, parseInt(tag.slice(1))),
    Infinity,
  );

  return (
    <div className="flex flex-col text-sm text-muted-foreground p-3 h-full overflow-x-hidden overflow-y-auto scrollbar-thin">
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
