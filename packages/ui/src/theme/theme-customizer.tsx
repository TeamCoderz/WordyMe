/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Button } from '@repo/ui/components/button';
import { Slider } from '@repo/ui/components/slider';
import { Tabs, TabsList, TabsTrigger } from '@repo/ui/components/tabs';
import { SunIcon, Scaling, CloudMoon, Palette } from '@repo/ui/components/icons';
import { SCALE_OPTIONS, ModeValue, ScaleValue, ScalePercent } from './themes';
import { useTheme } from './theme-provider';
import { useState, useCallback } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../components/dropdown-menu';

export function ThemeCustomizer({
  beforeScaleChange,
}: {
  beforeScaleChange?: (args: { scale: ScaleValue; percent: ScalePercent }) => void;
}) {
  const [open, setOpen] = useState(false);
  const { mode, setMode, scale, setScale } = useTheme();

  const handleModeChange = useCallback(
    (newMode: ModeValue) => {
      setMode(newMode);
    },
    [setMode],
  );

  const scaleToPercent = (value: ScaleValue): ScalePercent => {
    switch (value) {
      case 'tiny':
        return '50%';
      case 'small':
        return '75%';
      case 'medium':
        return '100%';
      case 'large':
        return '125%';
      case 'huge':
        return '150%';
      default:
        return '100%';
    }
  };

  const handleScaleChange = useCallback(
    (newScale: ScaleValue) => {
      const percent = scaleToPercent(newScale);
      beforeScaleChange?.({ scale: newScale, percent });
      setScale(newScale);
    },
    [setScale, beforeScaleChange],
  );

  // Map slider values (0-4) to scale options and percentages
  const scaleIndexToValue = (index: number): ScaleValue => {
    return (SCALE_OPTIONS[index]?.value as ScaleValue) || 'medium';
  };

  const scaleValueToIndex = (value: ScaleValue): number => {
    return SCALE_OPTIONS.findIndex((option) => option.value === value);
  };

  const handleSliderChange = useCallback(
    (values: number[]) => {
      const newScale = scaleIndexToValue(values[0] ?? 2);
      handleScaleChange(newScale);
    },
    [handleScaleChange],
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="border bg-background">
          <Palette />
          <span className="sr-only">Customize theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="p-2">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="[&_svg]:hidden flex items-center gap-2">
            <Scaling className="size-4 !block" />
            Scale
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="w-64 space-y-4 p-4">
              <div className="relative">
                <Slider
                  value={[scaleValueToIndex(scale)]}
                  onValueChange={handleSliderChange}
                  min={0}
                  max={4}
                  step={1}
                  className="w-full"
                />
                {/* Dots on the slider track */}
                <div className="absolute top-1/2 left-0 right-0 flex justify-between pointer-events-none -translate-y-1/2">
                  {Array.from({ length: 5 }, (_, index) => {
                    const currentIndex = scaleValueToIndex(scale);
                    const isActive = index <= currentIndex;
                    const isCurrentPosition = index === currentIndex;
                    return (
                      <div
                        key={index}
                        role="button"
                        aria-label={`Set scale to ${SCALE_OPTIONS[index]?.name ?? index + 1}`}
                        aria-hidden={isCurrentPosition}
                        tabIndex={isCurrentPosition ? -1 : 0}
                        onClick={() => {
                          if (!isCurrentPosition) {
                            handleScaleChange(scaleIndexToValue(index));
                          }
                        }}
                        onKeyDown={(e) => {
                          if (!isCurrentPosition && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            handleScaleChange(scaleIndexToValue(index));
                          }
                        }}
                        className={`w-3 h-3 rounded-full border border-border ring-ring/50 hover:ring-4 focus-visible:ring-4 transition-[color,box-shadow] ${
                          isCurrentPosition
                            ? 'pointer-events-none'
                            : 'pointer-events-auto cursor-pointer'
                        } ${index !== 0 && index !== 4 ? '-translate-x-1/2' : ''} ${
                          isCurrentPosition ? 'opacity-0' : isActive ? 'bg-primary' : 'bg-white'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
                <span>125%</span>
                <span>150%</span>
              </div>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuSeparator />

        <Tabs
          value={mode === 'system' ? 'light' : mode}
          onValueChange={(value) => handleModeChange(value as ModeValue)}
        >
          <TabsList className="w-full">
            <TabsTrigger value="light" className="flex items-center gap-2">
              <SunIcon className="h-4 w-4" />
              Light
            </TabsTrigger>
            <TabsTrigger value="dark" className="flex items-center gap-2">
              <CloudMoon className="h-4 w-4" />
              Dark
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
