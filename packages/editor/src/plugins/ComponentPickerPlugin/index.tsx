/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { $createCodeNode } from '@lexical/code';
import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@repo/editor/nodes/HorizontalRuleNode';
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { INSERT_TABLE_COMMAND, TableNode } from '@repo/editor/nodes/TableNode';
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_ELEMENT_COMMAND,
  LexicalEditor,
  TextNode,
} from 'lexical';
import { useCallback, useMemo, useState, JSX } from 'react';
import * as ReactDOM from 'react-dom';

import { INSERT_MATH_COMMAND } from '@repo/editor/plugins/MathPlugin';
import { INSERT_STICKY_COMMAND } from '@repo/editor/plugins/StickyPlugin';
import { useActions, useSelector } from '@repo/editor/store';
import {
  INSERT_PAGE_BREAK,
  INSERT_PAGE_NUMBER_COMMAND,
} from '@repo/editor/plugins/PaginationPlugin';
import { INSERT_DETAILS_COMMAND } from '@repo/editor/plugins/DetailsPlugin';
import { Command, CommandItem, CommandList, CommandShortcut } from '@repo/ui/components/command';
import {
  AlertCircleIcon,
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BinaryIcon,
  BrushIcon,
  CheckSquareIcon,
  CodeIcon,
  ColumnsIcon,
  ExpandIcon,
  GlobeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  ImageIcon,
  ListIcon,
  ListOrderedIcon,
  MinusIcon,
  MusicIcon,
  QuoteIcon,
  ScissorsIcon,
  StickyNoteIcon,
  TableIcon,
  FileUpIcon,
  HashIcon,
  ShapesIcon,
} from '@repo/ui/components/icons';
import { YoutubeIcon } from '@repo/editor/components/icons';
import { cn } from '@repo/ui/lib/utils';
import React from 'react';
import { INSERT_ALERT_COMMAND } from '@repo/editor/plugins/AlertPlugin';

const Heading = (level: number) =>
  level === 1 ? (
    <Heading1Icon />
  ) : level === 2 ? (
    <Heading2Icon />
  ) : level === 3 ? (
    <Heading3Icon />
  ) : (
    <Heading4Icon />
  );

const FormatAlignIcon = (alignment: string) =>
  alignment === 'left' ? (
    <AlignLeftIcon className="size-4" />
  ) : alignment === 'center' ? (
    <AlignCenterIcon className="size-4" />
  ) : alignment === 'right' ? (
    <AlignRightIcon className="size-4" />
  ) : (
    <AlignJustifyIcon className="size-4" />
  );

class ComponentPickerOption extends MenuOption {
  // What shows up in the editor
  title: string;
  // Icon for display
  icon?: JSX.Element;
  // For extra searching.
  keywords: Array<string>;
  // TBD
  keyboardShortcut?: string;
  // What happens when you select this option?
  onSelect: (queryString: string) => void;
  desc?: string;
  constructor(
    title: string,
    options: {
      icon?: JSX.Element;
      keywords?: Array<string>;
      keyboardShortcut?: string;
      onSelect: (queryString: string) => void;
      desc?: string;
    },
  ) {
    super(title);
    this.title = title;
    this.keywords = options.keywords || [];
    this.icon = options.icon;
    this.keyboardShortcut = options.keyboardShortcut;
    this.onSelect = options.onSelect.bind(this);
    this.desc = options.desc; // Add this line
  }
}

function getDynamicOptions(editor: LexicalEditor, queryString: string) {
  const options: Array<ComponentPickerOption> = [];
  if (!editor.hasNode(TableNode)) return options;
  if (queryString == null) {
    return options;
  }

  const tableMatch = queryString.match(/^([1-9]\d?)(?:x([1-9]\d?)?)?$/);

  if (tableMatch !== null) {
    const rows = tableMatch[1]!;
    const colOptions = tableMatch[2]!
      ? [tableMatch[2]]
      : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(String);

    options.push(
      ...colOptions.map(
        (columns) =>
          new ComponentPickerOption(`${rows}x${columns} Table`, {
            icon: <TableIcon className="size-4" />,
            keywords: ['table'],
            keyboardShortcut: `${rows}x${columns}`,
            onSelect: () => editor.dispatchCommand(INSERT_TABLE_COMMAND, { columns, rows }),
            desc: `Insert a table with ${rows} rows and ${columns} columns`,
          }),
      ),
    );
  }

  return options;
}

export default function ComponentPickerMenuPlugin() {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>(null);
  const { updateEditorStoreState } = useActions();
  const isPaged = useSelector((state) => state.pageSetup?.isPaged);
  const isPageHeader = useSelector((state) => state.isPageHeader);
  const isPageFooter = useSelector((state) => state.isPageFooter);

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch('/', {
    minLength: 0,
  });

  const getBaseOptions = useCallback(
    () => [
      ...Array.from({ length: 4 }, (_, i) => i + 1).map(
        (n) =>
          new ComponentPickerOption(`Heading ${n}`, {
            icon: Heading(n),
            keywords: ['heading', 'header', `h${n}`],
            keyboardShortcut: '#'.repeat(n),
            desc: `Level ${n} heading`,
            onSelect: () =>
              editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                  $setBlocksType(selection, () =>
                    // @ts-expect-error Correct types, but since they're dynamic TS doesn't like it.
                    $createHeadingNode(`h${n}`),
                  );
                }
              }),
          }),
      ),
      new ComponentPickerOption('Numbered List', {
        icon: <ListOrderedIcon className="size-4" />,
        keywords: ['numbered list', 'ordered list', 'ol'],
        keyboardShortcut: '1.',
        desc: 'Ordered Items',
        onSelect: () => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
      }),
      new ComponentPickerOption('Bulleted List', {
        icon: <ListIcon className="size-4" />,
        keywords: ['bulleted list', 'unordered list', 'ul'],
        keyboardShortcut: '*',
        desc: 'Unordered items',
        onSelect: () => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
      }),
      new ComponentPickerOption('Check List', {
        icon: <CheckSquareIcon className="size-4" />,
        keywords: ['check list', 'todo list'],
        keyboardShortcut: '[x]',
        desc: 'Tasks or checklists',
        onSelect: () => editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined),
      }),
      new ComponentPickerOption('Quote', {
        icon: <QuoteIcon className="size-4" />,
        keywords: ['block quote'],
        keyboardShortcut: '>',
        desc: 'Quote or citations',
        onSelect: () =>
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              $setBlocksType(selection, () => $createQuoteNode());
            }
          }),
      }),
      new ComponentPickerOption('Code', {
        icon: <CodeIcon className="size-4" />,
        keywords: ['javascript', 'python', 'js', 'codeblock'],
        keyboardShortcut: '```',
        desc: 'Code snippets',
        onSelect: () =>
          editor.update(() => {
            const selection = $getSelection();

            if ($isRangeSelection(selection)) {
              if (selection.isCollapsed()) {
                $setBlocksType(selection, () => $createCodeNode());
              } else {
                const textContent = selection.getTextContent();
                const codeNode = $createCodeNode();
                selection.insertNodes([codeNode]);
                selection.insertRawText(textContent);
              }
            }
          }),
      }),
      new ComponentPickerOption('Divider', {
        icon: <MinusIcon className="size-4" />,
        keywords: ['horizontal rule', 'divider', 'hr'],
        keyboardShortcut: '---',
        desc: 'Horizontal line',
        onSelect: () => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined),
      }),
      new ComponentPickerOption('Math', {
        icon: <BinaryIcon className="size-4" />,
        keywords: ['equation', 'latex', 'math'],
        keyboardShortcut: '$$',
        desc: 'Math equation',
        onSelect: () => editor.dispatchCommand(INSERT_MATH_COMMAND, { value: '' }),
      }),
      ...['left', 'center', 'right', 'justify'].map(
        (alignment) =>
          new ComponentPickerOption(`Align ${alignment}`, {
            icon: FormatAlignIcon(alignment),
            keywords: ['align', alignment],
            keyboardShortcut: `/${alignment}`,
            desc: `Align text ${alignment}`,
            onSelect: () =>
              // @ts-expect-error Correct types, but since they're dynamic TS doesn't like it.
              editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment),
          }),
      ),
      new ComponentPickerOption('Alert', {
        icon: <AlertCircleIcon className="size-4" />,
        keywords: ['alert', 'warning', 'info', 'notification', 'message'],
        keyboardShortcut: '/alert',
        desc: 'Insert an alert message',
        onSelect: () => editor.dispatchCommand(INSERT_ALERT_COMMAND, undefined),
      }),
      new ComponentPickerOption('Image', {
        icon: <ImageIcon className="size-4" />,
        keywords: ['image', 'photo', 'picture', 'img'],
        keyboardShortcut: '/img',
        desc: 'Insert an image',
        onSelect: () => updateEditorStoreState('openDialog', 'image'),
      }),
      new ComponentPickerOption('Attachment', {
        icon: <FileUpIcon className="size-4" />,
        keywords: ['file', 'attachment'],
        keyboardShortcut: '/file',
        desc: 'Attach a file',
        onSelect: () => updateEditorStoreState('openDialog', 'attachment'),
      }),
      new ComponentPickerOption('Sketch', {
        icon: <BrushIcon className="size-4" />,
        keywords: ['excalidraw', 'sketch'],
        keyboardShortcut: '/sketch',
        desc: 'Draw a sketch',
        onSelect: () => updateEditorStoreState('openDialog', 'sketch'),
      }),
      new ComponentPickerOption('Diagram', {
        icon: <ShapesIcon className="size-4" />,
        keywords: ['diagram', 'drawio'],
        keyboardShortcut: '/diagram',
        desc: 'Draw a diagram',
        onSelect: () => updateEditorStoreState('openDialog', 'diagram'),
      }),
      new ComponentPickerOption('Score', {
        icon: <MusicIcon className="size-4" />,
        keywords: ['score', 'music'],
        keyboardShortcut: '/score',
        desc: 'Insert a musical score',
        onSelect: () => updateEditorStoreState('openDialog', 'score'),
      }),
      new ComponentPickerOption('Note', {
        icon: <StickyNoteIcon className="size-4" />,
        keywords: ['sticky', 'note', 'sticky note'],
        keyboardShortcut: '/note',
        desc: 'Add a sticky note',
        onSelect: () => editor.dispatchCommand(INSERT_STICKY_COMMAND, undefined),
      }),
      new ComponentPickerOption('Table', {
        icon: <TableIcon className="size-4" />,
        keywords: ['table', 'grid', 'spreadsheet'],
        keyboardShortcut: '/3x3',
        desc: 'Insert a table',
        onSelect: () => updateEditorStoreState('openDialog', 'table'),
      }),
      new ComponentPickerOption('Columns', {
        icon: <ColumnsIcon className="size-4" />,
        keywords: ['columns', 'layout', 'col'],
        keyboardShortcut: '/col',
        desc: 'Create a multi-column layout',
        onSelect: () => updateEditorStoreState('openDialog', 'layout'),
      }),
      ...(isPaged && !isPageHeader && !isPageFooter
        ? [
            new ComponentPickerOption('Page Break', {
              icon: <ScissorsIcon className="size-4" />,
              keywords: ['page break', 'break', 'page'],
              keyboardShortcut: '/page',
              desc: 'Insert a page break',
              onSelect: () => editor.dispatchCommand(INSERT_PAGE_BREAK, undefined),
            }),
          ]
        : []),
      ...(isPageHeader || isPageFooter
        ? [
            new ComponentPickerOption('Page Number', {
              icon: <HashIcon className="size-4" />,
              keywords: ['pn', 'page number', 'page', 'number'],
              keyboardShortcut: '/pn',
              desc: 'Insert page number',
              onSelect: () => editor.dispatchCommand(INSERT_PAGE_NUMBER_COMMAND, 'current'),
            }),
            new ComponentPickerOption('Pages Count', {
              icon: <HashIcon className="size-4" />,
              keywords: ['pc', 'pages count', 'pages', 'count'],
              keyboardShortcut: '/pc',
              desc: 'Insert pages count',
              onSelect: () => editor.dispatchCommand(INSERT_PAGE_NUMBER_COMMAND, 'total'),
            }),
          ]
        : []),
      new ComponentPickerOption('IFrame', {
        icon: <GlobeIcon className="size-4" />,
        keywords: ['iframe', 'embed'],
        keyboardShortcut: '/iframe',
        desc: 'Embed web content',
        onSelect: () => updateEditorStoreState('openDialog', 'iframe'),
      }),
      new ComponentPickerOption('Details', {
        icon: <ExpandIcon className="size-4" />,
        keywords: ['details', 'summary', 'expand', 'collapse'],
        keyboardShortcut: '/details',
        desc: 'Insert a collapsible container',
        onSelect: () => editor.dispatchCommand(INSERT_DETAILS_COMMAND, undefined),
      }),
      new ComponentPickerOption('Youtube', {
        icon: <YoutubeIcon className="size-4" />,
        keywords: ['youtube', 'video'],
        keyboardShortcut: '/youtube',
        desc: 'Embed a youtube video',
        onSelect: () => updateEditorStoreState('openDialog', 'iframe'),
      }),
    ],
    [editor, isPaged, isPageHeader, isPageFooter, updateEditorStoreState],
  );

  const options = useMemo(() => {
    const baseOptions = getBaseOptions();

    if (!queryString) {
      return baseOptions;
    }

    const regex = new RegExp(queryString, 'i');

    return [
      ...getDynamicOptions(editor, queryString),
      ...baseOptions.filter(
        (option) =>
          regex.test(option.title) || option.keywords.some((keyword) => regex.test(keyword)),
      ),
    ];
  }, [editor, queryString, getBaseOptions]);

  const onSelectOption = useCallback(
    (
      selectedOption: ComponentPickerOption,
      nodeToRemove: TextNode | null,
      closeMenu: () => void,
      matchingString: string,
    ) => {
      editor.update(() => {
        if (nodeToRemove) {
          nodeToRemove.remove();
        }
        selectedOption.onSelect(matchingString);
        closeMenu();
      });
    },
    [editor],
  );

  return (
    <LexicalTypeaheadMenuPlugin<ComponentPickerOption>
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={checkForTriggerMatch}
      options={options}
      menuRenderFn={(
        anchorElementRef,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
      ) =>
        anchorElementRef.current && options.length
          ? ReactDOM.createPortal(
              <div
                className={`overflow-hidden z-[100] relative max-w-60 w-60 max-h-[300px] h-fit border rounded-sm bg-background shadow-sm shadow-muted-foreground/20`}
              >
                <Command>
                  <CommandList>
                    {options.map((option, i: number) => (
                      <CommandItem
                        ref={option.ref as React.Ref<HTMLDivElement>}
                        className={cn(
                          'gap-x-2 h-full border-0 transition-colors cursor-pointer rounded-sm relative',
                          selectedIndex == i ? '!bg-accent' : '!bg-transparent',
                        )}
                        onSelect={() => {
                          setHighlightedIndex(i);
                          selectOptionAndCleanUp(option);
                        }}
                        onMouseEnter={() => {
                          setHighlightedIndex(i);
                        }}
                        key={option.key}
                      >
                        <div className="p-3 h-full bg-gray-400/60 dark:bg-gray-300/10 rounded-sm">
                          {option.icon}
                        </div>
                        <div className="flex flex-row justify-between items-center flex-1">
                          <div className="flex justify-center items-start flex-col">
                            <div>{option.title}</div>
                            <span className="text-sm text-muted-foreground break-words">
                              {option.desc}
                            </span>
                          </div>
                          {option.keyboardShortcut && (
                            <CommandShortcut>{option.keyboardShortcut}</CommandShortcut>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </div>,
              anchorElementRef.current,
            )
          : null
      }
    />
  );
}
