/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useEffect, useMemo } from 'react';
import { BlockTypeIcon } from '@repo/editor/components/icons';
import {
  formatBulletList,
  formatCheckList,
  formatCode,
  formatHeading,
  formatNumberedList,
  formatParagraph,
  formatQuote,
} from '@repo/editor/utils/toolbarUtils';
import { DropDown } from '@repo/editor/components/dropdown';
import { restoreFocus } from '@repo/editor/utils/restoreFocus';
import { SHORTCUTS } from '@repo/editor/plugins/ShortcutsPlugin';
import { blockTypeToBlockName, useSelector } from '@repo/editor/store';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { SET_BLOCK_TYPE_COMMAND } from '@repo/editor/commands';
import { COMMAND_PRIORITY_LOW } from 'lexical';

export function BlockFormatSelect({ className }: { className?: string }) {
  const [editor] = useLexicalComposerContext();
  const blockType = useSelector((state) => state.blockType);
  const Blocks = useMemo(
    () => ({
      paragraph: {
        value: 'paragraph',
        icon: <BlockTypeIcon type="paragraph" />,
        label: 'Normal',
        desc: 'Plain text',
        shortcut: SHORTCUTS.NORMAL,
        func: () => formatParagraph(editor),
      },
      h1: {
        value: 'h1',
        icon: <BlockTypeIcon type="h1" />,
        desc: 'Main title',
        label: 'Heading 1',
        shortcut: SHORTCUTS.HEADING1,
        func: () => formatHeading(editor, blockType, 'h1'),
      },
      h2: {
        value: 'h2',
        icon: <BlockTypeIcon type="h2" />,
        desc: 'Major sections',
        label: 'Heading 2',
        shortcut: SHORTCUTS.HEADING2,
        func: () => formatHeading(editor, blockType, 'h2'),
      },
      h3: {
        value: 'h3',
        icon: <BlockTypeIcon type="h3" />,
        desc: 'Sub-sections',
        label: 'Heading 3',
        shortcut: SHORTCUTS.HEADING3,
        func: () => formatHeading(editor, blockType, 'h3'),
      },
      h4: {
        value: 'h4',
        icon: <BlockTypeIcon type="h4" />,
        desc: 'Minor sections',
        label: 'Heading 4',
        shortcut: SHORTCUTS.HEADING4,
        func: () => formatHeading(editor, blockType, 'h4'),
      },
      h5: {
        value: 'h5',
        icon: <BlockTypeIcon type="h5" />,
        desc: 'Small heading',
        label: 'Heading 5',
        shortcut: SHORTCUTS.HEADING5,
        func: () => formatHeading(editor, blockType, 'h5'),
      },
      h6: {
        value: 'h6',
        icon: <BlockTypeIcon type="h6" />,
        desc: 'Tiny heading',
        label: 'Heading 6',
        shortcut: SHORTCUTS.HEADING6,
        func: () => formatHeading(editor, blockType, 'h6'),
      },
      number: {
        value: 'number',
        icon: <BlockTypeIcon type="number" />,
        desc: 'Ordered items',
        label: 'Numbered list',
        shortcut: SHORTCUTS.NUMBERED_LIST,
        func: () => formatNumberedList(editor, blockType),
      },
      bullet: {
        value: 'bullet',
        icon: <BlockTypeIcon type="bullet" />,
        desc: 'Unordered items',
        label: 'Bullet List',
        shortcut: SHORTCUTS.BULLET_LIST,
        func: () => formatBulletList(editor, blockType),
      },
      check: {
        value: 'check',
        icon: <BlockTypeIcon type="check" />,
        desc: 'Tasks or checklists',
        label: 'check box',
        shortcut: SHORTCUTS.CHECK_LIST,
        func: () => formatCheckList(editor, blockType),
      },
      code: {
        value: 'code',
        icon: <BlockTypeIcon type="code" />,
        desc: 'Code snippets',
        label: 'Code',
        shortcut: SHORTCUTS.CODE_BLOCK,
        func: () => formatCode(editor, blockType),
      },
      quote: {
        value: 'quote',
        icon: <BlockTypeIcon type="quote" />,
        desc: 'Quote or citation',
        label: 'Blockquote',
        shortcut: SHORTCUTS.QUOTE,
        func: () => formatQuote(editor, blockType),
      },
    }),
    [editor],
  );

  const currentBlock = Blocks[blockType] || Blocks.paragraph;
  const blockName = blockTypeToBlockName[blockType] || currentBlock.label;

  useEffect(() => {
    return editor.registerCommand(
      SET_BLOCK_TYPE_COMMAND,
      (nextBlockType) => {
        switch (nextBlockType) {
          case 'paragraph':
            Blocks.paragraph.func();
            break;
          case 'h1':
            Blocks.h1.func();
            break;
          case 'h2':
            Blocks.h2.func();
            break;
          case 'h3':
            Blocks.h3.func();
            break;
          case 'h4':
            Blocks.h4.func();
            break;
          case 'h5':
            Blocks.h5.func();
            break;
          case 'h6':
            Blocks.h6.func();
            break;
          case 'number':
            Blocks.number.func();
            break;
          case 'bullet':
            Blocks.bullet.func();
            break;
          case 'check':
            Blocks.check.func();
            break;
          case 'code':
            Blocks.code.func();
            break;
          case 'quote':
            Blocks.quote.func();
            break;
          default:
            return false;
        }
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, Blocks]);

  return (
    <DropDown
      className={className}
      label={
        <>
          {currentBlock.icon}
          <span className="max-sm:hidden">{blockName}</span>
        </>
      }
      options={Object.values(Blocks)}
      value={blockType}
      onClose={() => restoreFocus(editor)}
    />
  );
}
