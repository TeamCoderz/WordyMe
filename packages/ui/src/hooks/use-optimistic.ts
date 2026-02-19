/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';
import { useCallback, useEffect, useRef, useState, useLayoutEffect } from 'react';

export function useOptimistic<T, P>(passthrough: T, reducer: (state: T, payload: P) => T) {
  const [value, setValue] = useState(passthrough);

  useEffect(() => {
    setValue(passthrough);
  }, [passthrough]);

  const reducerRef = useRef(reducer);
  useLayoutEffect(() => {
    reducerRef.current = reducer;
  }, []);

  const dispatch = useCallback(
    (payload: P) => {
      setValue(reducerRef.current(value, payload));
    },
    [value],
  );

  return [value, dispatch] as const;
}
