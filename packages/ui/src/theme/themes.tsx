/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import newYorkImage from '../assets/new-york.svg';
export const THEMES = [
  {
    name: 'New York',
    image: newYorkImage,
    value: 'new-york',
    'color-variants': [
      {
        name: 'Default',
        value: 'default',
        colors: {
          light: 'oklch(1 0 0)',
          dark: 'oklch(0.145 0 0)',
        },
      },
      {
        name: 'Blue',
        value: 'blue',
        colors: {
          light: 'oklch(0.7 0.15 255)',
          dark: 'oklch(0.488 0.243 264.376)',
        },
      },
      {
        name: 'New Blue',
        value: 'blue-new',
        colors: {
          light: 'oklch(0.55 0.13 260)',
          dark: 'oklch(0.6 0.15 260)',
        },
      },
      {
        name: 'Green',
        value: 'green',
        colors: {
          light: 'oklch(0.75 0.15 145)',
          dark: 'oklch(0.6 0.18 145)',
        },
      },
      {
        name: 'Yellow',
        value: 'yellow',
        colors: {
          light: 'oklch(0.85 0.15 85)',
          dark: 'oklch(0.8 0.18 85)',
        },
      },
      {
        name: 'Orange',
        value: 'orange',
        colors: {
          light: 'oklch(0.8 0.15 60)',
          dark: 'oklch(0.7 0.18 60)',
        },
      },

      {
        name: 'Rose',
        value: 'rose',
        colors: {
          light: 'oklch(0.73 0.2 10)',
          dark: 'oklch(0.65 0.22 10)',
        },
      },
      {
        name: 'Violet',
        value: 'violet',
        colors: {
          light: 'oklch(0.75 0.2 280)',
          dark: 'oklch(0.65 0.22 280)',
        },
      },
    ],
  },
] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_BY_VALUE = Object.fromEntries(
  THEMES.map((theme) => [theme.value, theme]),
) as Record<Theme['value'], Theme>;

export const SCALE_OPTIONS = [
  {
    name: 'Tiny',
    value: 'tiny',
    className: 'text-xs',
  },
  {
    name: 'Small',
    value: 'small',
    className: 'text-sm',
  },
  {
    name: 'Medium',
    value: 'medium',
    className: 'text-base',
  },
  {
    name: 'Large',
    value: 'large',
    className: 'text-lg',
  },
  {
    name: 'Huge',
    value: 'huge',
    className: 'text-xl',
  },
];

export const TOP_BAR_THEMES = [
  {
    name: 'Default',
    value: 'default',
    colors: {
      light: 'oklch(0.97 0 0)',
      dark: 'oklch(0.269 0 0)',
    },
  },
  {
    name: 'Blue',
    value: 'blue',
    colors: {
      light: 'oklch(70.7% 0.165 254.624)',
      dark: 'oklch(0.25 0.04 260)',
    },
  },
  {
    name: 'New Blue',
    value: 'blue-new',
    colors: {
      light: 'oklch(0.55 0.13 260)',
      dark: 'oklch(0.6 0.15 260)',
    },
  },
  {
    name: 'Green',
    value: 'green',
    colors: {
      light: 'oklch(0.75 0.15 145)',
      dark: 'oklch(0.6 0.18 145)',
    },
  },
  {
    name: 'Yellow',
    value: 'yellow',
    colors: {
      light: 'oklch(0.85 0.15 85)',
      dark: 'oklch(0.8 0.18 85)',
    },
  },
  {
    name: 'Orange',
    value: 'orange',
    colors: {
      light: 'oklch(0.8 0.15 60)',
      dark: 'oklch(0.7 0.18 60)',
    },
  },
  {
    name: 'Red',
    value: 'red',
    colors: {
      light: 'oklch(0.7 0.18 25)',
      dark: 'oklch(0.6 0.2 25)',
    },
  },
  {
    name: 'Rose',
    value: 'rose',
    colors: {
      light: 'oklch(0.73 0.2 10)',
      dark: 'oklch(0.65 0.22 10)',
    },
  },
  {
    name: 'Violet',
    value: 'violet',
    colors: {
      light: 'oklch(0.75 0.2 280)',
      dark: 'oklch(0.65 0.22 280)',
    },
  },
] as const;

export type ModeValue = 'light' | 'dark' | 'system';
export type ScaleValue = (typeof SCALE_OPTIONS)[number]['value'];
export type ThemeValue = (typeof THEMES)[number]['value'];
export type TopBarThemeValue = (typeof TOP_BAR_THEMES)[number]['value'];
export type ScalePercent = '50%' | '75%' | '100%' | '125%' | '150%';
