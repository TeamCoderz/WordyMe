/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';
import * as React from 'react';
import { ColorPicker as AdminColorPicker } from '@repo/ui/components/color-picker';
import { Toggle } from '@repo/ui/components/toggle';
import { cn } from '@repo/ui/lib/utils';

import { Paintbrush } from '@repo/ui/components/icons';
import { Button } from '@repo/ui/components/button';
import { useTheme } from '@repo/ui/theme/theme-provider';

export const textPalette: `#${string}`[] = [
  // Reds
  '#d7170b',
  '#e63946',
  '#c1121f',
  '#dc2f02',
  '#9d0208',
  // Oranges
  '#fe8a2b',
  '#ff8c42',
  '#ff9e00',
  '#fb8500',
  '#fd7e14',
  // Yellows
  '#ffc02b',
  '#ffbe0b',
  '#fdca40',
  '#f9c74f',
  '#ffd60a',
  // Greens
  '#63b215',
  '#118ab2',
  '#3a86ff',
  // Purples
  '#a219e6',
  '#8338ec',
  '#7209b7',
  // Pinks
  '#eb4799',
  '#f72585',
  '#ff0a54',
  // Neutrals
  '#0a0a0a',
  '#333333',
  '#666666',
  '#A6A6A6',
  '#d4d5d2',
  '#ffffff',
];

export const backgroundPalette: `#${string}`[] = [
  // Reds (light)
  '#fbbbb6',
  '#ffb3b3',
  '#ffc2c2',
  // Oranges (light)
  '#ffe0c2',
  '#ffe5d0',
  '#ffd8a8',
  // Yellows (light)
  '#fff1c2',
  '#fff3b0',
  '#ffffb7',
  // Greens (light)
  '#d0e8b9',
  '#bceac4',
  '#c1f8cf',
  '#d8f3dc',
  // Blues (light)
  '#b9f1f1',
  '#b6d9fb',
  '#caf0f8',
  '#ddedff',
  // Purples (light)
  '#e3baf8',
  '#e0c3fc',
  '#dcc7ff',
  // Pinks (light)
  '#f9c8e0',
  '#ffd1e8',
  '#ffcce6',
  // Neutrals
  '#242424',
  '#5c5c5c',
  '#8C8C8C',
  '#D0D0D0',
  '#F0F0F0',
  '#f8f9fa',
  '#ffffff',
];

// Border palette: all text colors, as lighter border options
export const borderPalette: `#${string}`[] = [
  // Reds
  '#d7170b',
  '#e63946',
  '#c1121f',
  '#dc2f02',
  '#9d0208',
  // Oranges
  '#fe8a2b',
  '#ff8c42',
  '#ff9e00',
  '#fb8500',
  '#fd7e14',
  // Yellows
  '#ffc02b',
  '#ffbe0b',
  '#fdca40',
  '#f9c74f',
  '#ffd60a',
  // Greens
  '#63b215',
  '#118ab2',
  '#3a86ff',
  // Purples
  '#a219e6',
  '#8338ec',
  '#7209b7',
  // Pinks
  '#eb4799',
  '#f72585',
  '#ff0a54',
  // Neutrals
  '#0a0a0a',
  '#333333',
  '#4d4d4d',
  '#bbbbbb',
  '#d4d5d2',
  '#ffffff',
];

export default function ColorPicker({
  onColorChange,
  onOpen,
  onClose,
  toggle = 'togglebutton',
  label = 'Color',
  tabs = ['color', 'background-color'],
  className,
  textColor,
  backgroundColor,
  borderColor,
  defaultTextColor,
  defaultBackgroundColor,
  defaultBorderColor,
  isStatic,
  ...props
}: {
  onColorChange: (key: string, value: string | null) => void;
  onOpen?: () => void;
  onClose?: () => void;
  toggle?: 'togglebutton' | 'menuitem' | 'none';
  className?: string;
  label?: string;
  tabs?: ('color' | 'background-color' | 'border-color')[];
  textColor?: string | null;
  backgroundColor?: string | null;
  borderColor?: string | null;
  defaultTextColor?: string | null;
  defaultBackgroundColor?: string | null;
  defaultBorderColor?: string | null;
  isStatic?: boolean;
} & React.ComponentProps<'button'>) {
  const [open, setOpen] = React.useState(false);
  const { mode } = useTheme();
  const systemMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const resolvedMode = mode === 'system' ? systemMode : mode;
  const resolvedDefaultTextColor =
    defaultTextColor || resolvedMode === 'dark' ? '#ffffff' : '#0a0a0a';
  const resolvedDefaultBackgroundColor =
    defaultBackgroundColor || resolvedMode === 'dark' ? '#242424' : '#ffffff';
  const resolvedDefaultBorderColor =
    defaultBorderColor || resolvedMode === 'dark' ? '#4d4d4d' : '#bbbbbb';

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      onOpen?.();
    } else {
      onClose?.();
    }
  };

  const onChange = (key: 'color' | 'background-color' | 'border-color', value: string | null) => {
    onColorChange(key, value);
  };

  return (
    <AdminColorPicker
      isStatic={isStatic}
      tabs={tabs}
      onValueChange={onChange}
      textColor={textColor as any}
      defaultTextColor={resolvedDefaultTextColor}
      backgroundColor={backgroundColor as any}
      defaultBackgroundColor={resolvedDefaultBackgroundColor}
      borderColor={borderColor as any}
      defaultBorderColor={resolvedDefaultBorderColor}
      hideAdvancedPicker
      textSwatches={textPalette}
      backgroundSwatches={backgroundPalette}
      borderSwatches={borderPalette}
      onInteractOutside={(e) => {
        if (e.type === 'dismissableLayer.focusOutside') {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {isStatic ? null : toggle === 'menuitem' ? (
        <Button
          variant="ghost"
          role="menuitem"
          onClick={() => handleOpen(!open)}
          className={cn(
            `
            font-normal [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full justify-start
            items-center gap-2 rounded-sm has-[>svg]:px-2 py-1.5 text-sm outline-hidden select-none
            data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8
            [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`,
            className,
          )}
          {...props}
        >
          <Paintbrush />
          <span>{label}</span>
        </Button>
      ) : toggle === 'none' ? null : (
        <Toggle
          value="color"
          variant="outline"
          pressed={open}
          className={cn('bg-background', className)}
          onClick={() => handleOpen(!open)}
          {...props}
        >
          <Paintbrush />
        </Toggle>
      )}
    </AdminColorPicker>
  );
}
