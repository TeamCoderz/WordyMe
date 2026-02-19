/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useTheme } from '@repo/ui/theme/theme-provider';
import { THEMES } from '@repo/ui/theme/themes';
import { Label } from '@repo/ui/components/label';
import { RadioGroup, RadioGroupItem } from '@repo/ui/components/radio-group';
import { cn } from '@repo/ui/lib/utils';

function ThemeSelect() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col flex-wrap gap-2">
      <div>
        <Label htmlFor="theme">Theme</Label>
        <p className="text-sm text-muted-foreground">Choose between light and dark mode</p>
      </div>
      <RadioGroup className="grid !min-h-full" defaultValue={theme} onValueChange={setTheme}>
        <div className="grid grid-cols-3 gap-3 h-full">
          {THEMES.map((t) => {
            return (
              <label
                className={cn(
                  'p-3 border cursor-pointer flex-col flex gap-3 rounded-xl',
                  theme === t.value && 'border-primary bg-primary/10',
                )}
                key={t.value}
                htmlFor={t.value}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value={t.value} id={t.value} />
                  <Label className="font-medium text-xs" htmlFor={t.value}>
                    {t.name}
                  </Label>
                </div>
                <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
              </label>
            );
          })}
        </div>
      </RadioGroup>
    </div>
  );
}

export default ThemeSelect;
