import { MinusIcon, PlusIcon } from '@repo/ui/components/icons';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { cn } from '@repo/ui/lib/utils';
import {
  updateFontSize,
  updateFontSizeInSelection,
  UpdateFontSizeType,
} from '@repo/editor/utils/toolbarUtils';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useSelector, MIN_ALLOWED_FONT_SIZE, MAX_ALLOWED_FONT_SIZE } from '@repo/editor/store';

export const FontSizePicker = ({
  onBlur,
  className,
  skipDomSelection,
  disabled,
}: {
  onClick?: () => void;
  onBlur?: () => void;
  className?: string;
  skipDomSelection?: boolean;
  disabled?: boolean;
}) => {
  const [editor] = useLexicalComposerContext();
  const fontSize = useSelector((state) => state.fontSize);
  const fontSizeInputValue = useSelector((state) => state.fontSizeInputValue);
  const updateFontSizeByInputValue = (inputValueNumber: number) => {
    let updatedFontSize = inputValueNumber;
    if (inputValueNumber > MAX_ALLOWED_FONT_SIZE) {
      updatedFontSize = MAX_ALLOWED_FONT_SIZE;
    } else if (inputValueNumber < MIN_ALLOWED_FONT_SIZE) {
      updatedFontSize = MIN_ALLOWED_FONT_SIZE;
    }

    updateFontSizeInSelection(editor, String(updatedFontSize) + 'px', null, true);
  };

  return (
    <div
      className={cn('flex items-center bg-background', className)}
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        variant="outline"
        size="icon"
        disabled={parseInt(fontSize) <= MIN_ALLOWED_FONT_SIZE || disabled}
        tabIndex={-1}
        onClick={(e) => {
          e.stopPropagation();
          updateFontSize(
            editor,
            UpdateFontSizeType.decrement,
            fontSizeInputValue,
            skipDomSelection,
          );
          if (!skipDomSelection && onBlur) onBlur();
        }}
        className="rounded-r-none border-r-0"
        aria-label="decrease font size"
      >
        <MinusIcon className="h-4 w-4" />
      </Button>
      <Input
        type="number"
        className="w-10 rounded-none text-center px-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        value={parseInt(fontSize) || ''}
        onChange={(e) => {
          updateFontSizeByInputValue(parseInt(e.target.value || '0') % 100);
        }}
        onClick={(e) => e.stopPropagation()}
        onBlur={(e) => {
          const inputValue = parseInt(e.target.value || '0') % 100;
          const prevValue = parseInt(fontSize);
          if (inputValue !== prevValue) return;
          updateFontSizeByInputValue(inputValue);
        }}
        min={MIN_ALLOWED_FONT_SIZE}
        max={MAX_ALLOWED_FONT_SIZE}
        onKeyDown={(e) => {
          const isEscaping = e.key === 'Escape' || e.key === 'Enter';
          if (isEscaping && onBlur) return onBlur();
          const isNavigatingUp = e.key === 'ArrowUp';
          const isNavigatingDown = e.key === 'ArrowDown';
          if (!isNavigatingUp && !isNavigatingDown) e.stopPropagation();
          const menuItem = (e.target as HTMLElement).closest('li');
          if (!menuItem) return;
          if (isNavigatingDown) menuItem.focus();
        }}
        aria-label="font size"
        disabled={disabled}
      />
      <Button
        variant="outline"
        size="icon"
        disabled={parseInt(fontSize) >= MAX_ALLOWED_FONT_SIZE || disabled}
        onClick={(e) => {
          e.stopPropagation();
          updateFontSize(
            editor,
            UpdateFontSizeType.increment,
            fontSizeInputValue,
            skipDomSelection,
          );
          if (!skipDomSelection && onBlur) onBlur();
        }}
        className="rounded-l-none"
        aria-label="increase font size"
      >
        <PlusIcon className="h-4 w-4" />
      </Button>
    </div>
  );
};
