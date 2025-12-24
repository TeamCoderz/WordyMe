import { useTheme } from '@repo/ui/theme/theme-provider';
import { Button } from '@repo/ui/components/button';
import { Label } from '@repo/ui/components/label';
import { cn } from '@repo/ui/lib/utils';
import { THEME_BY_VALUE } from '@repo/ui/theme/themes';
import { CircleOff } from '@repo/ui/components/icons';

function ColorThemeSelector() {
  const { theme, color, setColor } = useTheme();

  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <Label htmlFor="theme">Color</Label>
        <p className="text-sm text-muted-foreground">Choose the color theme.</p>
      </div>
      <div className="flex gap-2 overflow-auto">
        {THEME_BY_VALUE[theme]['color-variants'].map((themeOption) => {
          return (
            <div key={themeOption.value} className={`color-${themeOption.value} w-8 h-8`}>
              <Button
                variant={'default'}
                onClick={() => {
                  setColor(themeOption.value);
                }}
                className={cn('flex flex-col items-center gap-1 h-full py-3 w-full relative')}
              >
                {color === themeOption.value && <CircleOff />}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default ColorThemeSelector;
