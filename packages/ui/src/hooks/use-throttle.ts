/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useEffect, useRef, useState } from 'react';

export function useThrottle<T>(value: T, interval = 500) {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastUpdated = useRef<number | null>(null);

  useEffect(() => {
    const now = Date.now();
    const wait =
      lastUpdated.current === null ? 0 : Math.max(lastUpdated.current + interval - now, 0);

    const id = window.setTimeout(() => {
      lastUpdated.current = Date.now();
      setThrottledValue(value);
    }, wait);

    return () => window.clearTimeout(id);
  }, [value, interval]);

  return throttledValue;
}
