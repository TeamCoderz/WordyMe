'use client';

import {
  type HexColor,
  hexToHsva,
  type HslaColor,
  hslaToHsva,
  type HsvaColor,
  hsvaToHex,
  hsvaToHsla,
  hsvaToHslString,
  hsvaToRgba,
  type RgbaColor,
  rgbaToHsva,
} from '@uiw/color-convert';
import Hue from '@uiw/react-color-hue';
import Saturation from '@uiw/react-color-saturation';
import { CheckIcon, ChevronDownIcon, RotateCcwIcon, XIcon } from '@repo/ui/components/icons';
import React, { useEffect } from 'react';

import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { Input } from '@repo/ui/components/input';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/popover';
import { Separator } from '@repo/ui/components/separator';
import { Tabs, TabsList, TabsTrigger } from '@repo/ui/components/tabs';
import { cn } from '@repo/ui/lib/utils';

function getColorAsHsva(color: `#${string}` | HsvaColor | HslaColor | RgbaColor): HsvaColor {
  if (typeof color === 'string') {
    return hexToHsva(color);
  } else if ('h' in color && 's' in color && 'v' in color) {
    return color;
  } else if ('r' in color) {
    return rgbaToHsva(color);
  } else {
    return hslaToHsva(color);
  }
}

type ColorPickerValue = {
  hex: string;
  hsl: HslaColor;
  rgb: RgbaColor;
};

type ColorPickerProps = {
  textColor?: `#${string}` | HsvaColor | HslaColor | RgbaColor;
  backgroundColor?: `#${string}` | HsvaColor | HslaColor | RgbaColor;
  borderColor?: `#${string}` | HsvaColor | HslaColor | RgbaColor;
  defaultTextColor?: `#${string}` | HsvaColor | HslaColor | RgbaColor;
  defaultBackgroundColor?: `#${string}` | HsvaColor | HslaColor | RgbaColor;
  defaultBorderColor?: `#${string}` | HsvaColor | HslaColor | RgbaColor;
  tabs?: ('color' | 'background-color' | 'border-color')[];
  type?: 'hsl' | 'rgb' | 'hex';
  textSwatches?: HexColor[];
  backgroundSwatches?: HexColor[];
  borderSwatches?: HexColor[];
  hideContrastRatio?: boolean;
  hideAdvancedPicker?: boolean;
  className?: string;
  onValueChange?: (
    key: 'color' | 'background-color' | 'border-color',
    value: string | null,
  ) => void;
  isStatic?: boolean;
} & React.ComponentProps<typeof PopoverContent>;

function ColorPickerWrapper({
  textColor,
  backgroundColor,
  borderColor,
  tabs = ['color', 'background-color'],
  defaultTextColor = '#0a0a0a',
  defaultBackgroundColor = '#ffffff',
  defaultBorderColor = '#000000',
  children,
  type = 'hsl',
  textSwatches = [],
  backgroundSwatches = [],
  borderSwatches = [],
  hideContrastRatio,
  hideAdvancedPicker,
  onValueChange,
  className,
  isStatic,
  ...props
}: ColorPickerProps) {
  if (isStatic) {
    return (
      <ColorPicker
        type={type}
        textColor={textColor}
        backgroundColor={backgroundColor}
        borderColor={borderColor}
        defaultTextColor={defaultTextColor}
        defaultBackgroundColor={defaultBackgroundColor}
        defaultBorderColor={defaultBorderColor}
        tabs={tabs}
        textSwatches={textSwatches}
        backgroundSwatches={backgroundSwatches}
        borderSwatches={borderSwatches}
        hideContrastRatio={hideContrastRatio}
        hideAdvancedPicker={hideAdvancedPicker}
        onValueChange={onValueChange}
      />
    );
  }
  return (
    <Popover {...props}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className={cn('w-50 p-0', className)} {...props}>
        <ColorPicker
          type={type}
          textColor={textColor}
          backgroundColor={backgroundColor}
          borderColor={borderColor}
          defaultTextColor={defaultTextColor}
          defaultBackgroundColor={defaultBackgroundColor}
          defaultBorderColor={defaultBorderColor}
          tabs={tabs}
          textSwatches={textSwatches}
          backgroundSwatches={backgroundSwatches}
          borderSwatches={borderSwatches}
          hideContrastRatio={hideContrastRatio}
          hideAdvancedPicker={hideAdvancedPicker}
          onValueChange={onValueChange}
        />
      </PopoverContent>
    </Popover>
  );
}

type ContrastRatioProps = {
  textColor: HsvaColor;
  backgroundColor: HsvaColor;
  borderColor: HsvaColor;
  defaultTextColor: HsvaColor;
  defaultBackgroundColor: HsvaColor;
  defaultBorderColor: HsvaColor;
  onResetColors?: (
    textColor: HsvaColor,
    backgroundColor: HsvaColor,
    borderColor: HsvaColor,
  ) => void;
};

function ColorPicker({
  textColor,
  backgroundColor,
  borderColor,
  defaultTextColor = '#0a0a0a',
  defaultBackgroundColor = '#ffffff',
  defaultBorderColor = '#000000',
  tabs = ['color', 'background-color'],
  type = 'hsl',
  textSwatches = [],
  backgroundSwatches = [],
  borderSwatches = [],
  hideContrastRatio,
  hideAdvancedPicker,
  onValueChange,
}: ColorPickerProps) {
  const [activeTab, setActiveTab] = React.useState(tabs[0]);
  const [colorType, setColorType] = React.useState(type);
  const [textColorHsv, setTextColorHsv] = React.useState<HsvaColor>(
    getColorAsHsva(textColor || defaultTextColor),
  );
  const [bgColorHsv, setBgColorHsv] = React.useState<HsvaColor>(
    getColorAsHsva(backgroundColor || defaultBackgroundColor),
  );
  const [borderColorHsv, setBorderColorHsv] = React.useState<HsvaColor>(
    getColorAsHsva(borderColor || defaultBorderColor),
  );

  useEffect(() => {
    setTextColorHsv(getColorAsHsva(textColor || defaultTextColor));
    setBgColorHsv(getColorAsHsva(backgroundColor || defaultBackgroundColor));
    setBorderColorHsv(getColorAsHsva(borderColor || defaultBorderColor));
  }, [
    textColor,
    backgroundColor,
    borderColor,
    defaultTextColor,
    defaultBackgroundColor,
    defaultBorderColor,
  ]);

  const handleValueChange = (
    key: 'color' | 'background-color' | 'border-color',
    value: string | null,
  ) => {
    onValueChange?.(key, value);
    if (key === 'color') {
      setTextColorHsv(getColorAsHsva((value as `#${string}`) || defaultTextColor));
    } else if (key === 'background-color') {
      setBgColorHsv(getColorAsHsva((value as `#${string}`) || defaultBackgroundColor));
    } else if (key === 'border-color') {
      setBorderColorHsv(getColorAsHsva((value as `#${string}`) || defaultBorderColor));
    }
  };

  const currentColorHsv =
    activeTab === 'color'
      ? textColorHsv
      : activeTab === 'background-color'
        ? bgColorHsv
        : borderColorHsv;
  const setCurrentColorHsv = (color: HsvaColor) => {
    handleValueChange(activeTab, hsvaToHex(color));
  };

  const currentSwatches =
    activeTab === 'color'
      ? textSwatches
      : activeTab === 'background-color'
        ? backgroundSwatches
        : borderSwatches;

  const handleResetColors = (
    textColor: HsvaColor,
    backgroundColor: HsvaColor,
    borderColor: HsvaColor,
  ) => {
    if (tabs.includes('color')) {
      setTextColorHsv(textColor);
      handleValueChange('color', null);
    }
    if (tabs.includes('background-color')) {
      setBgColorHsv(backgroundColor);
      handleValueChange('background-color', null);
    }
    if (tabs.includes('border-color')) {
      setBorderColorHsv(borderColor);
      handleValueChange('border-color', null);
    }
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) =>
        setActiveTab(value as 'color' | 'background-color' | 'border-color')
      }
      className="w-full"
      style={
        {
          '--selected-color': hsvaToHslString(currentColorHsv),
          '--text-color': hsvaToHslString(textColorHsv),
          '--bg-color': hsvaToHslString(bgColorHsv),
          '--border-color': hsvaToHslString(borderColorHsv),
        } as React.CSSProperties
      }
    >
      <TabsList className="w-full items-end rounded-b-none border-b pb-0">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab}
            className="items-end leading-none rounded-b-none !border-b-transparent translate-y-[1px] !shadow-none data-[state=active]:!bg-popover"
            value={tab}
          >
            {tab === 'color' ? 'Text' : tab === 'background-color' ? 'Bg' : 'Border'}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="space-y-2 p-4">
        {!hideAdvancedPicker && (
          <>
            <Saturation
              hsva={currentColorHsv}
              onChange={(newColor) => {
                setCurrentColorHsv(newColor);
              }}
              style={{
                width: '100%',
                height: 'auto',
                aspectRatio: '4/2',
                borderRadius: '0.3rem',
              }}
              className="border border-border"
            />
            <Hue
              hue={currentColorHsv.h}
              onChange={(newHue) => {
                setCurrentColorHsv({ ...currentColorHsv, ...newHue });
              }}
              className="[&>div:first-child]:overflow-hidden [&>div:first-child]:!rounded"
              style={
                {
                  width: '100%',
                  height: '0.9rem',
                  borderRadius: '0.3rem',
                  '--alpha-pointer-background-color': 'hsl(var(--foreground))',
                } as React.CSSProperties
              }
            />

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="shrink-0 justify-between uppercase">
                    {colorType}
                    <ChevronDownIcon
                      className="-me-1 ms-2 opacity-60"
                      size={16}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuCheckboxItem
                    checked={colorType === 'hex'}
                    onCheckedChange={() => setColorType('hex')}
                  >
                    HEX
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={colorType === 'hsl'}
                    onCheckedChange={() => setColorType('hsl')}
                  >
                    HSL
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={colorType === 'rgb'}
                    onCheckedChange={() => setColorType('rgb')}
                  >
                    RGB
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="flex grow">
                {colorType === 'hsl' && (
                  <ObjectColorInput
                    value={hsvaToHsla(currentColorHsv)}
                    label="hsl"
                    onValueChange={(value) => {
                      setCurrentColorHsv(hslaToHsva(value));
                    }}
                  />
                )}
                {colorType === 'rgb' && (
                  <ObjectColorInput
                    value={hsvaToRgba(currentColorHsv)}
                    label="rgb"
                    onValueChange={(value) => {
                      setCurrentColorHsv(rgbaToHsva(value));
                    }}
                  />
                )}
                {colorType === 'hex' && (
                  <Input
                    className="flex"
                    value={hsvaToHex(currentColorHsv)}
                    onChange={(e) => {
                      setCurrentColorHsv(hexToHsva(e.target.value));
                    }}
                  />
                )}
              </div>
            </div>
          </>
        )}
        {currentSwatches.length > 0 || (!hideAdvancedPicker && <Separator />)}
        <div className="flex flex-wrap justify-center gap-2">
          {[...currentSwatches]
            .sort((a, b) => hexToHsva(a).h - hexToHsva(b).h)
            .map((color) => (
              <button
                type="button"
                key={`${color}-swatch`}
                style={
                  {
                    '--swatch-color': color,
                  } as React.CSSProperties
                }
                onClick={() => setCurrentColorHsv(hexToHsva(color))}
                onKeyUp={(e) => (e.key === 'Enter' ? setCurrentColorHsv(hexToHsva(color)) : null)}
                aria-label={`Set color to ${color}`}
                className={cn(
                  'size-5 cursor-pointer rounded bg-[var(--swatch-color)] ring-2 ring-[var(--swatch-color)00] ring-offset-1 ring-offset-background transition-all duration-100 hover:ring-[var(--swatch-color)]',
                  {
                    'ring-[var(--swatch-color)]':
                      (activeTab === 'color' && color === hsvaToHex(textColorHsv)) ||
                      (activeTab === 'background-color' && color === hsvaToHex(bgColorHsv)) ||
                      (activeTab === 'border-color' && color === hsvaToHex(borderColorHsv)),
                  },
                )}
              />
            ))}
        </div>
        {!hideContrastRatio && tabs.includes('color') && tabs.includes('background-color') && (
          <>
            <Separator />
            <ContrastRatio
              textColor={textColorHsv}
              backgroundColor={bgColorHsv}
              borderColor={borderColorHsv}
              defaultTextColor={hexToHsva(defaultTextColor.toString())}
              defaultBackgroundColor={hexToHsva(defaultBackgroundColor.toString())}
              defaultBorderColor={hexToHsva(defaultBorderColor.toString())}
              onResetColors={handleResetColors}
            />
          </>
        )}
      </div>
    </Tabs>
  );
}

function ContrastRatio({
  textColor,
  backgroundColor,
  borderColor,
  defaultTextColor,
  defaultBackgroundColor,
  defaultBorderColor,
  onResetColors,
}: ContrastRatioProps) {
  const [contrastRatio, setContrastRatio] = React.useState(0);

  React.useEffect(() => {
    setContrastRatio(calculateContrastRatio(textColor, backgroundColor));
  }, [textColor, backgroundColor]);

  const ValidationBadge = ({
    ratio,
    ratioLimit,
    className,
    children,
    ...props
  }: {
    ratio: number;
    ratioLimit: number;
  } & Omit<React.ComponentProps<typeof Badge>, 'variant'>) => (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 px-1 rounded-full text-muted-foreground',
        ratio > ratioLimit &&
          'border-transparent bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
        className,
      )}
      {...props}
    >
      {ratio > ratioLimit ? <CheckIcon size={16} /> : <XIcon size={16} />}
      {children}
    </Badge>
  );

  return (
    <div className="flex items-center gap-3">
      <button
        className="font-medium group flex flex-shrink-0 size-10 border items-center justify-center rounded transition-colors hover:bg-muted/50"
        style={{
          backgroundColor: hsvaToHslString(backgroundColor),
          color: hsvaToHslString(textColor),
          borderColor: hsvaToHslString(borderColor),
        }}
        onClick={() => {
          setContrastRatio(calculateContrastRatio(defaultTextColor, defaultBackgroundColor));
          if (onResetColors)
            onResetColors(defaultTextColor, defaultBackgroundColor, defaultBorderColor);
        }}
        aria-label="Reset colors to default"
      >
        <span className="w-4 group-hover:size-0 overflow-hidden transition-all duration-200">
          A
        </span>
        <RotateCcwIcon className="size-0 group-hover:size-4 transition-all duration-200" />
      </button>
      <div className="flex flex-col justify-between">
        <div className="flex items-center gap-1">
          <span className="whitespace-nowrap text-nowrap text-xs text-muted-foreground">
            Contrast:{' '}
          </span>
          <span className="text-sm">{contrastRatio}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <ValidationBadge ratio={contrastRatio} ratioLimit={4.5}>
            AA
          </ValidationBadge>
          <ValidationBadge ratio={contrastRatio} ratioLimit={7}>
            AAA
          </ValidationBadge>
        </div>
      </div>
    </div>
  );
}

function calculateContrastRatio(textColor: HsvaColor, backgroundColor: HsvaColor): number {
  const textRgb = hsvaToRgba(textColor);
  const bgRgb = hsvaToRgba(backgroundColor);

  const toSRGB = (c: number) => {
    const channel = c / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };

  const getLuminance = (rgb: RgbaColor) => {
    const r = toSRGB(rgb.r);
    const g = toSRGB(rgb.g);
    const b = toSRGB(rgb.b);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const textLuminance = getLuminance(textRgb);
  const bgLuminance = getLuminance(bgRgb);

  // Calculate contrast ratio
  const ratio =
    textLuminance > bgLuminance
      ? (textLuminance + 0.05) / (bgLuminance + 0.05)
      : (bgLuminance + 0.05) / (textLuminance + 0.05);

  return Number(ratio.toFixed(2));
}

type ObjectColorInputProps =
  | {
      label: 'hsl';
      value: HslaColor;
      onValueChange?: (value: HslaColor) => void;
    }
  | {
      label: 'rgb';
      value: RgbaColor;
      onValueChange?: (value: RgbaColor) => void;
    };

function ObjectColorInput({ value, label, onValueChange }: ObjectColorInputProps) {
  function handleChange(val: Partial<HslaColor | RgbaColor>) {
    if (onValueChange) {
      if (label === 'hsl' && 'h' in val) {
        onValueChange(val as HslaColor);
      } else if (label === 'rgb' && 'r' in val) {
        onValueChange(val as RgbaColor);
      }
    }
  }
  return (
    <div className="-mt-px flex">
      <div className="relative min-w-0 flex-1 focus-within:z-10">
        <Input
          className="peer rounded-e-none shadow-none [direction:inherit]"
          value={label === 'hsl' ? value.h.toFixed(0) : value.r}
          onChange={(e) =>
            handleChange({
              ...value,
              [label === 'hsl' ? 'h' : 'r']: e.target.value,
            })
          }
        />
      </div>
      <div className="relative -ms-px min-w-0 flex-1 focus-within:z-10">
        <Input
          className="peer rounded-none shadow-none [direction:inherit]"
          value={label === 'hsl' ? value.s.toFixed(0) : value.g}
          onChange={(e) =>
            handleChange({
              ...value,
              [label === 'hsl' ? 's' : 'g']: e.target.value,
            })
          }
        />
      </div>
      <div className="relative -ms-px min-w-0 flex-1 focus-within:z-10">
        <Input
          className="peer rounded-s-none shadow-none [direction:inherit]"
          value={label === 'hsl' ? value.l.toFixed(0) : value.b}
          onChange={(e) =>
            handleChange({
              ...value,
              [label === 'hsl' ? 'l' : 'b']: e.target.value,
            })
          }
        />
      </div>
    </div>
  );
}

export { ColorPickerWrapper as ColorPicker };
export type { ColorPickerProps, ColorPickerValue };
