/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useMemo } from 'react';
import '../lib/match-container';
import * as React from 'react';

function getContainer(
  container: string | HTMLElement | React.RefObject<HTMLElement | null> | (() => HTMLElement),
) {
  if (container instanceof HTMLElement) return container;
  if (typeof container === 'string') return document.querySelector<HTMLElement>(container);
  if (typeof container === 'function') return container();
  return container.current;
}

/**
 * Hook to observe container width for container-query-like behavior in JS.
 * Uses Element.matchContainer() (polyfilled in lib/match-container) when available.
 * Falls back to ResizeObserver when the container has no child or matchContainer is unavailable.
 * @param container - Container element or selector string, or ref to container element
 * @param query - CSS container query string to match against
 */
export function useContainerQuery(
  container: string | HTMLElement | React.RefObject<HTMLElement | null> | (() => HTMLElement),
  query: string,
): boolean | undefined {
  const containerElement = getContainer(container);
  const hasMatchContainer =
    'matchContainer' in Element.prototype && typeof containerElement?.matchContainer === 'function';
  const queryList = useMemo(() => {
    if (!hasMatchContainer) return undefined;
    return containerElement.matchContainer(query);
  }, [containerElement, query]);

  const [matches, setMatches] = React.useState(queryList?.matches ?? undefined);

  React.useEffect(() => {
    if (!queryList) return;
    const handleChange = () => setMatches(queryList.matches);
    queryList.addEventListener('change', handleChange);
    setMatches(queryList.matches);

    return () => queryList.removeEventListener('change', handleChange);
  }, [queryList]);

  return matches;
}
