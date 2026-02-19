/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Button } from '@repo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { cn } from '@repo/ui/lib/utils';
import { TopBarFormValues } from '@/schemas/top-bar-form.schema';
import { TOP_BAR_THEMES } from '@repo/ui/theme/themes';
import { ControllerRenderProps } from 'react-hook-form';
import { useActions } from '@/store';

export default function TopBarThemeDropDown({
  field,
  type = 'base',
}: {
  field:
    | ControllerRenderProps<TopBarFormValues, 'top_bar_theme_color'>
    | ControllerRenderProps<TopBarFormValues, 'top_bar_start_color'>
    | ControllerRenderProps<TopBarFormValues, 'top_bar_end_color'>;
  type?: 'start' | 'end' | 'base';
}) {
  const { setTopBarTheme, setEndColor, setStartColor } = useActions();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className={`flex gap-2 top-bar-${field.value} transition-all duration-300`}>
          <div className="h-5 w-5 rounded-full border bg-top-bar-primary" />
          <span>{field.value}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent onCloseAutoFocus={(e) => e.preventDefault()}>
        <DropdownMenuLabel>
          {type === 'base' && 'Top Bar Theme'}
          {type === 'start' && 'Top Bar Start Color'}
          {type === 'end' && 'Top Bar End Color'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={field.value}
          onValueChange={(value) => {
            if (type === 'base') setTopBarTheme(value as (typeof TOP_BAR_THEMES)[number]['value']);
            if (type === 'start') setStartColor(value as (typeof TOP_BAR_THEMES)[number]['value']);
            if (type === 'end') setEndColor(value as (typeof TOP_BAR_THEMES)[number]['value']);
            field.onChange(value);
          }}
          className="grid grid-cols-3 justify-items-center gap-2"
        >
          {TOP_BAR_THEMES.map((themeOption) => {
            return (
              <DropdownMenuRadioItem
                key={themeOption.value}
                value={themeOption.value}
                className={`w-full h-full p-0 top-bar-${themeOption.value}`}
              >
                <div className={`w-full h-full`}>
                  <Button
                    variant={field.value === themeOption.value ? 'default' : 'outline'}
                    className={cn(
                      'flex flex-col hover:bg-top-bar-secondary/20 !text-foreground items-center gap-1 h-auto py-3 w-full relative',
                      {
                        'bg-top-bar-primary/20': field.value === themeOption.value,
                      },
                    )}
                  >
                    <>
                      <div className="h-5 w-5 rounded-full border bg-top-bar-primary" />
                      <span>{themeOption.name}</span>
                    </>
                  </Button>
                </div>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
