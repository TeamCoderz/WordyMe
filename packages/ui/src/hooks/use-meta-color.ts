/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as React from 'react';
import { useTheme } from '../theme/theme-provider';

export const META_THEME_COLORS = {
  light: '#ffffff',
  dark: '#09090b',
};

export function useMetaColor() {
  const { mode } = useTheme();
  const systemMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const resolvedMode = mode === 'system' ? systemMode : mode;

  const metaColor = resolvedMode !== 'dark' ? META_THEME_COLORS.light : META_THEME_COLORS.dark;

  const setMetaColor = React.useCallback((color: string) => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
  }, []);

  return {
    metaColor,
    setMetaColor,
  };
}
