/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';
import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND, TextFormatType } from 'lexical';
import { $patchStyleText } from '@lexical/selection';
import { useCallback, useMemo } from 'react';
import ColorPicker from '@repo/editor/components/color-picker';
import { $isMathNode, MathNode } from '@repo/editor/nodes/MathNode';
import { $patchStyle } from '@repo/editor/utils/nodeUtils';
import { cn } from '@repo/ui/lib/utils';
import {
  CodeIcon,
  LinkIcon,
  HighlighterIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikethroughIcon,
  SubscriptIcon,
  SuperscriptIcon,
} from '@repo/ui/components/icons';
import { ToggleGroup, ToggleGroupItem } from '@repo/ui/components/toggle-group';
import { SHORTCUTS } from '@repo/editor/plugins/ShortcutsPlugin';
import { useSelector, useActions } from '@repo/editor/store';
import { restoreFocus } from '@repo/editor/utils/restoreFocus';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

export default function TextFormatToggles({ className }: { className?: string }) {
  const [editor] = useLexicalComposerContext();
  const isBold = useSelector((state) => state.isBold);
  const isItalic = useSelector((state) => state.isItalic);
  const isUnderline = useSelector((state) => state.isUnderline);
  const isStrikethrough = useSelector((state) => state.isStrikethrough);
  const isSubscript = useSelector((state) => state.isSubscript);
  const isSuperscript = useSelector((state) => state.isSuperscript);
  const isCode = useSelector((state) => state.isCode);
  const isHighlight = useSelector((state) => state.isHighlight);
  const isLink = useSelector((state) => state.isLink);
  const fontColor = useSelector((state) => state.fontColor);
  const bgColor = useSelector((state) => state.bgColor);
  const { updateEditorStoreState } = useActions();

  const applyStyleText = useCallback(
    (styles: Record<string, string | null>) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $patchStyleText(selection, styles);
          const mathNodes = selection.getNodes().filter((node) => $isMathNode(node)) as MathNode[];
          $patchStyle(mathNodes, styles);
        }
      });
    },
    [editor],
  );

  const onColorChange = useCallback(
    (key: string, value: string | null) => {
      applyStyleText({ [key]: value });
    },
    [applyStyleText],
  );

  const formatText = (value: string) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, value as TextFormatType);
  };

  const format = useMemo(
    () => ({
      bold: isBold,
      italic: isItalic,
      underline: isUnderline,
      strikethrough: isStrikethrough,
      subscript: isSubscript,
      superscript: isSuperscript,
      code: isCode,
      highlight: isHighlight,
      link: isLink,
    }),
    [
      isBold,
      isItalic,
      isUnderline,
      isStrikethrough,
      isSubscript,
      isSuperscript,
      isCode,
      isHighlight,
      isLink,
    ],
  );
  const formatKeys = useMemo(
    () => Object.keys(format).filter((key) => format[key as keyof typeof format]),
    [format],
  );

  const onClose = useCallback(() => {
    restoreFocus(editor);
  }, [editor]);

  const openLinkDialog = () => updateEditorStoreState('openDialog', 'link');

  return (
    <ToggleGroup
      type="multiple"
      variant="outline"
      className={cn('bg-background max-sm:gap-1', className)}
      value={formatKeys}
    >
      <ToggleGroupItem
        value="bold"
        onClick={() => formatText('bold')}
        title={`Bold (${SHORTCUTS.BOLD})`}
        aria-label={`Format text as bold. Shortcut: ${SHORTCUTS.BOLD}`}
        className="max-sm:!rounded-md max-sm:!border-l"
      >
        <BoldIcon className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="italic"
        onClick={() => formatText('italic')}
        title={`Italic (${SHORTCUTS.ITALIC})`}
        aria-label={`Format text as italics. Shortcut: ${SHORTCUTS.ITALIC}`}
        className="max-sm:!rounded-md max-sm:!border-l"
      >
        <ItalicIcon className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="underline"
        onClick={() => formatText('underline')}
        title={`Underline (${SHORTCUTS.UNDERLINE})`}
        aria-label={`Format text to underlined. Shortcut: ${SHORTCUTS.UNDERLINE}`}
        className="max-sm:!rounded-md max-sm:!border-l"
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="highlight"
        onClick={() => formatText('highlight')}
        title={`Highlight (${SHORTCUTS.HIGHLIGHT})`}
        aria-label={`Format text as highlight. Shortcut: ${SHORTCUTS.HIGHLIGHT}`}
        className="max-sm:!rounded-md max-sm:!border-l"
      >
        <HighlighterIcon />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="code"
        onClick={() => formatText('code')}
        title={`Inline code (${SHORTCUTS.CODE})`}
        aria-label={`Format text as Inline code. Shortcut: ${SHORTCUTS.CODE}`}
        className="max-sm:!rounded-md max-sm:!border-l"
      >
        <CodeIcon className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="strikethrough"
        onClick={() => formatText('strikethrough')}
        title={`Strikethrough (${SHORTCUTS.STRIKETHROUGH})`}
        aria-label={`Format text as strikethrough. Shortcut: ${SHORTCUTS.STRIKETHROUGH}`}
        className="max-sm:!rounded-md max-sm:!border-l"
      >
        <StrikethroughIcon className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="subscript"
        onClick={() => formatText('subscript')}
        title={`Subscript (${SHORTCUTS.SUBSCRIPT})`}
        aria-label={`Format text with subscript. Shortcut: ${SHORTCUTS.SUBSCRIPT}`}
        className="max-sm:!rounded-md max-sm:!border-l"
      >
        <SubscriptIcon className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="superscript"
        onClick={() => formatText('superscript')}
        title={`Superscript (${SHORTCUTS.SUPERSCRIPT})`}
        aria-label={`Format text with superscript. Shortcut: ${SHORTCUTS.SUPERSCRIPT}`}
        className="max-sm:!rounded-md max-sm:!border-l"
      >
        <SuperscriptIcon className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="link"
        onClick={openLinkDialog}
        title={`Insert Link (${SHORTCUTS.INSERT_LINK})`}
        aria-label={`Insert a link. Shortcut: ${SHORTCUTS.INSERT_LINK}`}
        className="max-sm:!rounded-md max-sm:!border-l"
      >
        <LinkIcon className="h-4 w-4" />
      </ToggleGroupItem>
      <ColorPicker
        className="min-w-0 flex-1 shrink-0 rounded-none shadow-none first:rounded-l-md last:rounded-r-md focus:z-10 focus-visible:z-10 data-[variant=outline]:border-l-0 data-[variant=outline]:first:border-l max-sm:!rounded-md max-sm:!border-l sm:rounded-l-none sm:border-l-0"
        onColorChange={onColorChange}
        textColor={fontColor}
        backgroundColor={bgColor}
        onClose={onClose}
      />
    </ToggleGroup>
  );
}
