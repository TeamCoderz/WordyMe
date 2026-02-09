import { Button } from '@repo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { Label } from '@repo/ui/components/label';
import { cn } from '@repo/ui/lib/utils';
import { SCALE_OPTIONS } from '@repo/ui/theme/themes';
import { LayoutGridIcon } from '@repo/ui/components/icons';
import { useState } from 'react';
import { useTheme } from '@repo/ui/theme/theme-provider';

function ScaleSelector() {
  const { scale, setScale } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div>
        <Label htmlFor="theme">Scale</Label>
        <p className="text-sm text-muted-foreground">Choose the scale</p>
      </div>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button className={cn('flex items-center justify-center w-10 h-10')} title={scale}>
            <LayoutGridIcon className={cn('h-5 w-5')} />
            <span className="sr-only">{scale}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="grid grid-cols-5 items-center gap-2"
        >
          {SCALE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={scale === option.value ? 'default' : 'outline'}
              onClick={() => {
                setScale(option.value);
                setOpen(false);
              }}
              className={cn(
                'flex items-center justify-center h-10 w-full',
                `scale-${option.value}`,
              )}
              title={option.name}
            >
              <LayoutGridIcon className={cn('h-5 w-5', option.className)} />
              <span className="sr-only">{option.name}</span>
            </Button>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default ScaleSelector;
