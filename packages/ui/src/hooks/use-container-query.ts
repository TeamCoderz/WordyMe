/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import '../lib/match-container';
import * as React from 'react';

/**
 * Hook to observe container width for container-query-like behavior in JS.
 * Uses Element.matchContainer() (polyfilled in lib/match-container) when available.
 * Falls back to ResizeObserver when the container has no child or matchContainer is unavailable.
 * @param ref - Ref to the container element (should have container-type: inline-size)
 * @param minWidth - Minimum width in px for the query to match
 */
export function useContainerQuery(
  ref: React.RefObject<HTMLElement | null>,
  minWidth: number,
): boolean {
  const [matches, setMatches] = React.useState(
    ref.current
      ? parseInt(getComputedStyle(ref.current).width) >= minWidth
      : matchMedia(`(min-width: ${minWidth}px)`).matches,
  );

  React.useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const queryElement = container.firstElementChild;
    const hasMatchContainer = 'matchContainer' in Element.prototype;

    if (queryElement && hasMatchContainer && typeof queryElement.matchContainer === 'function') {
      const queryString = `(min-width: ${minWidth}px)`;
      const queryList = queryElement.matchContainer(queryString);

      const handleChange = () => setMatches(queryList.matches);
      queryList.addEventListener('change', handleChange);
      setMatches(queryList.matches);

      return () => queryList.removeEventListener('change', handleChange);
    }

    const updateMatches = () => setMatches(container.offsetWidth >= minWidth);
    const observer = new ResizeObserver(updateMatches);
    observer.observe(container);
    updateMatches();

    return () => observer.disconnect();
  }, [ref, minWidth]);

  return matches;
}
