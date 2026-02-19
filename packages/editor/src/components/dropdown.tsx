/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';

import * as React from 'react';
import { ChevronDown } from '@repo/ui/components/icons';
import { Button } from '@repo/ui/components/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
  CommandSeparator,
} from '@repo/ui/components/command';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/popover';
import { cn } from '@repo/ui/lib/utils';

export interface options {
  icon?: React.ReactNode;
  iconContainerClassName?: string;
  label: string | React.ReactNode;
  value: string;
  desc?: string;
  func?: () => void;
  className?: string;
  style?: React.CSSProperties;
  isSelected?: boolean;
  shortcut?: string;
  separator?: boolean;
  disabled?: boolean;
}
interface Props {
  label: React.ReactNode | string;
  className?: string;
  contentClassName?: string;
  header?: React.ReactNode;
  value: string;
  options: options[];
  disabled?: boolean;
  variant?: 'default' | 'split';
  triggerVariant?: 'ghost' | 'default' | 'outline' | 'link' | 'secondary' | 'destructive';
  triggerProps?: React.ComponentProps<typeof Button>;
  labelProps?: React.ComponentProps<typeof Button>;
  showSearch?: boolean;
  showChevrons?: boolean;
  side?: 'top' | 'right' | 'bottom' | 'left' | undefined;
  sideOffset?: number;
  onOpen?: () => void;
  onClose?: () => void;
}

export function DropDown({
  label,
  className,
  options,
  value,
  disabled,
  contentClassName,
  header,
  variant = 'default',
  triggerVariant = 'outline',
  triggerProps = { variant: 'outline' },
  labelProps = { variant: 'outline' },
  showSearch,
  showChevrons = true,
  side = 'bottom',
  sideOffset = 5,
  onOpen,
  onClose,
}: Props) {
  return (
    <Popover
      modal={false}
      onOpenChange={(open) => {
        if (open && onOpen) onOpen();
        else if (!open && onClose) onClose();
      }}
    >
      <div className="flex -space-x-px">
        {variant === 'split' && (
          <Button
            role="combobox"
            variant="outline"
            {...labelProps}
            className={cn('group/popover-trigger font-normal rounded-r-none', labelProps.className)}
          >
            {label}
          </Button>
        )}

        <PopoverTrigger disabled={disabled} asChild>
          {variant === 'split' ? (
            <Button
              role="combobox"
              variant="outline"
              {...triggerProps}
              className={cn(
                'group/popover-trigger font-normal rounded-l-none !p-2 min-w-9',
                triggerProps.className,
              )}
            >
              <ChevronDown className="size-4 opacity-50 transition-all group-data-[state=open]/popover-trigger:rotate-180 rounded-l-none" />
            </Button>
          ) : (
            <Button
              role="combobox"
              variant={triggerVariant}
              className={cn('group/popover-trigger font-normal !p-2 min-w-9', className)}
            >
              {label}
              {showChevrons && (
                <ChevronDown className="size-4 opacity-50 transition-all group-data-[state=open]/popover-trigger:rotate-180" />
              )}
            </Button>
          )}
        </PopoverTrigger>
      </div>

      <PopoverContent
        side={side}
        sideOffset={sideOffset}
        className={cn('w-65 p-0 dropdown-portal', contentClassName)}
      >
        {header}
        <Command defaultValue={value}>
          {showSearch && <CommandInput placeholder="Search..." autoFocus />}
          <CommandList>
            <CommandEmpty>No found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) =>
                option.separator ? (
                  <CommandSeparator key={option.value} className="my-1" />
                ) : (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    style={option.style}
                    className={cn(
                      'cursor-pointer',
                      value === option.value && 'bg-gray-300/10',
                      option.className,
                    )}
                    onSelect={() => {
                      if (option.func) option.func();
                      if (onClose) onClose();
                    }}
                    disabled={option.disabled}
                  >
                    {option.icon && (
                      <div
                        className={cn(
                          'p-3 h-full bg-gray-400/60 dark:bg-gray-300/10 rounded-sm',
                          option.iconContainerClassName,
                        )}
                      >
                        {option.icon}
                      </div>
                    )}
                    <div className="flex flex-row justify-between items-center flex-1">
                      <div className="flex justify-center items-start flex-col">
                        <div>{option.label}</div>
                        <span className="text-sm text-muted-foreground break-words">
                          {option.desc}
                        </span>
                      </div>
                      {option.shortcut && <CommandShortcut>{option.shortcut}</CommandShortcut>}
                    </div>
                  </CommandItem>
                ),
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
