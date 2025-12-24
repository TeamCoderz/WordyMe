import { Separator } from '@repo/ui/components/separator';
import ThemeSelect from './ThemeSelect';
import ColorThemeSelector from './ColorThemeSelector';

function ThemeCustomizer() {
  return (
    <>
      <ThemeSelect />
      <Separator className="bg-transparent border-t border-dashed h-0" />
      <ColorThemeSelector />
    </>
  );
}

export default ThemeCustomizer;
