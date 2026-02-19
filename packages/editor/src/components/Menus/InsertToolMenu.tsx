/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@repo/editor/nodes/HorizontalRuleNode';
import { INSERT_MATH_COMMAND } from '@repo/editor/plugins/MathPlugin';
import { INSERT_STICKY_COMMAND } from '@repo/editor/plugins/StickyPlugin';
import {
  INSERT_PAGE_BREAK,
  INSERT_PAGE_NUMBER_COMMAND,
} from '@repo/editor/plugins/PaginationPlugin';
import { INSERT_DETAILS_COMMAND } from '@repo/editor/plugins/DetailsPlugin';
import { DropDown, type options } from '@repo/editor/components/dropdown';
import {
  PlusIcon,
  SeparatorHorizontalIcon,
  FilePlus2Icon,
  FileUpIcon,
  FunctionSquareIcon,
  BrushIcon,
  ImageIcon,
  TableIcon,
  StickyNoteIcon,
  GlobeIcon,
  ColumnsIcon,
  ExpandIcon,
  AlertCircleIcon,
  MusicIcon,
  HashIcon,
  ShapesIcon,
} from '@repo/ui/components/icons';
import { YoutubeIcon } from '@repo/editor/components/icons';
import { INSERT_ALERT_COMMAND } from '@repo/editor/plugins/AlertPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useActions, useSelector } from '@repo/editor/store';

export default function InsertToolMenu() {
  const [editor] = useLexicalComposerContext();
  const isPaged = useSelector((state) => state.pageSetup?.isPaged);
  const isPageHeader = useSelector((state) => state.isPageHeader);
  const isPageFooter = useSelector((state) => state.isPageFooter);
  const { updateEditorStoreState } = useActions();
  const openImageDialog = () => updateEditorStoreState('openDialog', 'image');
  const openAttachmentDialog = () => updateEditorStoreState('openDialog', 'attachment');
  const openTableDialog = () => updateEditorStoreState('openDialog', 'table');
  const openSketchDialog = () => updateEditorStoreState('openDialog', 'sketch');
  const openDiagramDialog = () => updateEditorStoreState('openDialog', 'diagram');
  const openScoreDialog = () => updateEditorStoreState('openDialog', 'score');
  const openIFrameDialog = () => updateEditorStoreState('openDialog', 'iframe');
  const openLayoutDialog = () => updateEditorStoreState('openDialog', 'layout');

  const options: options[] = [
    {
      icon: <AlertCircleIcon className="text-white" />,
      iconContainerClassName: 'bg-[#F2C40D]!',
      label: 'Alert',
      value: 'alert',
      shortcut: '/alert',
      func: () => editor.dispatchCommand(INSERT_ALERT_COMMAND, undefined),
    },
    {
      icon: <SeparatorHorizontalIcon className="text-white" />,
      iconContainerClassName: 'bg-[#CF5F41]!',
      label: 'Divider',
      value: 'divider',
      shortcut: '---',
      func: () => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined),
    },
    ...(isPaged && !isPageHeader && !isPageFooter
      ? [
          {
            icon: <FilePlus2Icon className="text-white" />,
            iconContainerClassName: 'bg-[#CE3D85]!',
            label: 'Page',
            value: 'page',
            shortcut: '/page',
            func: () => editor.dispatchCommand(INSERT_PAGE_BREAK, undefined),
          },
        ]
      : []),
    ...(isPageHeader || isPageFooter
      ? [
          {
            icon: <HashIcon className="text-white" />,
            iconContainerClassName: 'bg-[#D946EF]!',
            label: 'Page Number',
            value: 'page-number',
            shortcut: '/pn',
            func: () => editor.dispatchCommand(INSERT_PAGE_NUMBER_COMMAND, 'current'),
          },
          {
            icon: <HashIcon className="text-white" />,
            iconContainerClassName: 'bg-[#A855F7]!',
            label: 'Pages Count',
            value: 'pages-count',
            shortcut: '/pc',
            func: () => editor.dispatchCommand(INSERT_PAGE_NUMBER_COMMAND, 'total'),
          },
        ]
      : []),
    {
      icon: <FunctionSquareIcon className="text-white" />,
      iconContainerClassName: 'bg-[#BF31C2]!',
      label: 'Math',
      value: 'math',
      shortcut: '$$',
      func: () => editor.dispatchCommand(INSERT_MATH_COMMAND, { value: '' }),
    },

    {
      icon: <ImageIcon className="text-white" />,
      iconContainerClassName: 'bg-[#5C52D4]!',
      label: 'Image',
      value: 'image',
      shortcut: '/img',
      func: openImageDialog,
    },

    {
      icon: <BrushIcon className="text-white" />,
      iconContainerClassName: 'bg-[#8534CC]!',
      label: 'Sketch',
      value: 'sketch',
      shortcut: '/sketch',
      func: openSketchDialog,
    },

    {
      icon: <ShapesIcon className="text-white" />,
      iconContainerClassName: 'bg-[#7C3AED]!',
      label: 'Diagram',
      value: 'diagram',
      shortcut: '/diagram',
      func: openDiagramDialog,
    },

    {
      icon: <MusicIcon className="text-white" />,
      iconContainerClassName: 'bg-[#6B46C1]!',
      label: 'Score',
      value: 'score',
      shortcut: '/score',
      func: openScoreDialog,
    },

    {
      icon: <FileUpIcon className="text-white" />,
      iconContainerClassName: 'bg-[#5552d4]!',
      label: 'Attachment',
      value: 'attachment',
      shortcut: '/file',
      func: openAttachmentDialog,
    },

    {
      icon: <TableIcon className="text-white" />,
      iconContainerClassName: 'bg-[#4591D1]!',
      label: 'Table',
      value: 'table',
      shortcut: '/3x3',
      func: openTableDialog,
    },

    {
      icon: <ColumnsIcon className="text-white" />,
      iconContainerClassName: 'bg-[#33BACC]!',

      label: 'Columns',
      value: 'columns',
      shortcut: '/col',
      func: openLayoutDialog,
    },

    {
      icon: <StickyNoteIcon className="text-white" />,
      iconContainerClassName: 'bg-[#2DB4A2]!',
      label: 'Note',
      value: 'note',
      shortcut: '/note',
      func: () => editor.dispatchCommand(INSERT_STICKY_COMMAND, undefined),
    },

    {
      icon: <GlobeIcon className="text-white" />,
      iconContainerClassName: 'bg-[#2DB47E]!',
      label: 'IFrame',
      value: 'iframe',
      shortcut: '/iframe',
      func: openIFrameDialog,
    },

    {
      icon: <ExpandIcon className="text-white" />,
      iconContainerClassName: 'bg-[#55B42D]!',
      label: 'Details',
      value: 'details',
      shortcut: '/details',
      func: () => editor.dispatchCommand(INSERT_DETAILS_COMMAND, undefined),
    },

    {
      icon: <YoutubeIcon className="text-[#FC0D1B]" />,
      iconContainerClassName: 'bg-white!',
      label: 'Youtube',
      value: 'youtube',
      shortcut: '/youtube',
      func: openIFrameDialog,
    },
  ];

  return (
    <DropDown
      label={<PlusIcon />}
      value=""
      options={options}
      showChevrons={false}
      triggerVariant="outline"
    />
  );
}
