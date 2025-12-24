import { cn } from '@repo/ui/lib/utils';
import { DropDown } from '@repo/editor/components/dropdown';
import { restoreFocus } from '@repo/editor/utils/restoreFocus';
import { DEFAULT_FONT_SIZE, useSelector } from '@repo/editor/store';
import { updateFontSizeInSelection } from '@repo/editor/utils/toolbarUtils';
import { COMMAND_PRIORITY_LOW, SET_FONT_SIZE_COMMAND } from '@repo/editor/commands';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useCallback, useEffect, useMemo } from 'react';
import { TypeIcon } from '@repo/ui/components/icons';

export const FontSizeSelect = ({
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
  const currentSizePx = parseInt(fontSize) || DEFAULT_FONT_SIZE;

  const sizeOptions = useMemo(() => {
    const commonSizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72];
    return Array.from(new Set(commonSizes)).map((s) => ({
      value: String(s),
      label: String(s),
      func: () => updateFontSizeInSelection(editor, String(s) + 'px', null, skipDomSelection),
    }));
  }, [editor, skipDomSelection]);

  useEffect(() => {
    return editor.registerCommand(
      SET_FONT_SIZE_COMMAND,
      (nextFontSize) => {
        if (!nextFontSize) return true;
        updateFontSizeInSelection(editor, nextFontSize, null, false);
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  const handleClose = useCallback(() => {
    if (onBlur) onBlur();
    restoreFocus(editor);
  }, [editor, onBlur]);

  return (
    <DropDown
      label={
        <span className="flex items-center gap-1 md:gap-2">
          <TypeIcon className="h-4 w-4" />
          <span className="menuitem-text">{currentSizePx}</span>
        </span>
      }
      className={cn('[&_.menuitem-text]:hidden [&_.menuitem-text]:sm:block', className)}
      contentClassName="w-20"
      value={String(currentSizePx)}
      options={sizeOptions}
      onClose={handleClose}
      disabled={disabled}
    />
  );
};
