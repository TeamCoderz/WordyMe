import type { JSX, ReactNode } from 'react';

import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  $getNearestNodeFromDOMNode,
  $createNodeSelection,
  $setSelection,
  FORMAT_ELEMENT_COMMAND,
  PASTE_COMMAND,
} from 'lexical';
import { useCallback, useEffect, useId, useMemo } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@repo/ui/components/context-menu';
import { useSelector, useActions, fontFamilyToFriendlyName } from '@repo/editor/store';
import {
  ANNOUNCE_COMMAND,
  SET_FONT_SIZE_COMMAND,
  UPDATE_TABLE_BORDER_STYLE_COMMAND,
  UPDATE_TABLE_BORDER_WIDTH_COMMAND,
  UPDATE_TABLE_COLOR_COMMAND,
} from '@repo/editor/commands';
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BrushIcon,
  CheckCircleIcon,
  ClipboardIcon,
  ColumnsIcon,
  CopyIcon,
  EditIcon,
  ExpandIcon,
  ExternalLinkIcon,
  FileDownIcon,
  FilePlus2Icon,
  FileTextIcon,
  FileUpIcon,
  FunctionSquareIcon,
  GlobeIcon,
  GripVerticalIcon,
  HashIcon,
  ImageIcon,
  InfoIcon,
  LinkIcon,
  MusicIcon,
  PaintbrushIcon,
  PlusIcon,
  ScissorsIcon,
  SeparatorHorizontalIcon,
  SquareDashedTopSolidIcon,
  StickyNoteIcon,
  SubtitlesIcon,
  SunMoonIcon,
  TableIcon,
  Trash2Icon,
  TypeIcon,
  UnlinkIcon,
  XCircleIcon,
} from '@repo/ui/components/icons';
import {
  CellMergeIcon,
  RemoveRowIcon,
  RemoveColumnIcon,
  AddRowAboveIcon,
  AddRowBelowIcon,
  AddColumnLeftIcon,
  AddColumnRightIcon,
  TextRotationVerticalIcon,
  TextRotationNoneIcon,
  AddRowHeaderIcon,
  AddColumnHeaderIcon,
  TextAlignIcon,
  FormatImageLeftIcon,
  FormatImageRightIcon,
  WolframIcon,
  HorizontalRuleIcon,
  BlockTypeIcon,
  DetailsVariantIcon,
  DetailsEditableIcon,
  YoutubeIcon,
} from '@repo/editor/components/icons';
import {
  readTextFileFromSystem,
  exportBlob,
  $exportNodes,
  $importNodes,
  handleCut,
  handleCopy,
  handlePaste,
  handlePastePlainText,
  handleDeleteNode,
} from '@repo/editor/utils/clipboard';
import { SHORTCUTS } from '@repo/editor/plugins/ShortcutsPlugin';
import { TableCellHeaderStates } from '@repo/editor/nodes/TableNode';
import ColorPicker from '@repo/editor/components/color-picker';
import { CODE_LANGUAGE_OPTIONS } from '@repo/editor/components/Tools/CodeTools';
import {
  SET_BLOCK_TYPE_COMMAND,
  SET_FONT_FAMILY_COMMAND,
  ALIGN_TABLE_COMMAND,
  DELETE_TABLE_COLUMN_COMMAND,
  DELETE_TABLE_ROW_COMMAND,
  FLOAT_TABLE_COMMAND,
  INSERT_TABLE_COLUMN_COMMAND,
  INSERT_TABLE_ROW_COMMAND,
  MERGE_TABLE_CELLS_COMMAND,
  TOGGLE_TABLE_CELL_WRITING_MODE_COMMAND,
  TOGGLE_TABLE_COLUMN_HEADER_COMMAND,
  TOGGLE_TABLE_ROW_HEADER_COMMAND,
  TOGGLE_TABLE_ROW_STRIPING_COMMAND,
  UPDATE_TABLE_CELL_COLOR_COMMAND,
  FLOAT_NOTE_COMMAND,
  UPDATE_NOTE_COLOR_COMMAND,
  UPDATE_ALERT_VARIANT_COMMAND,
  UPDATE_CODE_LANGUAGE_COMMAND,
  COPY_CODE_COMMAND,
  FLOAT_IMAGE_COMMAND,
  TOGGLE_IMAGE_FILTER_COMMAND,
  TOGGLE_IMAGE_CAPTION_COMMAND,
  UPDATE_MATH_COLOR_COMMAND,
  OPEN_MATH_EDIT_DIALOG_COMMAND,
  OPEN_WOLFRAM_COMMAND,
  UPDATE_HORIZONTAL_RULE_VARIANT_COMMAND,
  UPDATE_DETAILS_VARIANT_COMMAND,
  TOGGLE_DETAILS_EDITABLE_COMMAND,
} from '@repo/editor/commands';
import { $isImageNode } from '@repo/editor/nodes/ImageNode';
import {
  $isHorizontalRuleNode,
  INSERT_HORIZONTAL_RULE_COMMAND,
} from '@repo/editor/nodes/HorizontalRuleNode';
import { $isDetailsContainerNode } from '@repo/editor/nodes/DetailsNode';
import { restoreFocus } from '@repo/editor/utils/restoreFocus';
import { $findMatchingParent } from '@lexical/utils';
import { setSrcToDataUrl } from '@repo/editor/utils/setSrcToDataUrl';
import { $isAttachmentNode } from '@repo/editor/nodes/AttachmentNode';
import { $isPageBreakNode } from '@repo/editor/nodes/PageBreakNode';
import { INSERT_PAGE_NUMBER_COMMAND, INSERT_PAGE_BREAK } from '../PaginationPlugin';
import { INSERT_DETAILS_COMMAND } from '../DetailsPlugin';
import { INSERT_ALERT_COMMAND } from '../AlertPlugin';
import { INSERT_MATH_COMMAND } from '../MathPlugin';
import { INSERT_STICKY_COMMAND } from '../StickyPlugin';

interface ContextMenuPluginProps {
  children: ReactNode;
}

export default function ContextMenuPlugin({ children }: ContextMenuPluginProps): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const { getImageSignedUrl, getAttachmentSignedUrl } = useActions();
  const toastId = useId();
  const blockType = useSelector((state) => state.blockType);
  const isLink = useSelector((state) => state.isLink);
  const selectedLinkNode = useSelector((state) => state.selectedLinkNode);
  const isTable = useSelector((state) => state.isTable);
  const canMergeTableCells = useSelector((state) => state.canMergeTableCells);
  const canUnmergeTableCell = useSelector((state) => state.canUnmergeTableCell);
  const tableRowStriping = useSelector((state) => state.tableRowStriping);
  const tableCellHeaderState = useSelector((state) => state.tableCellHeaderState);
  const tableSelectionCounts = useSelector((state) => state.tableSelectionCounts);
  const {
    color: tableColor,
    backgroundColor: tableBackgroundColor,
    borderColor: tableBorderColor,
  } = useSelector((state) => state.tableStyle);
  const {
    color: tableCellColor,
    backgroundColor: tableCellBackgroundColor,
    writingMode: tableCellWritingMode,
  } = useSelector((state) => state.tableCellStyle);
  const { color: noteColor, backgroundColor: noteBackgroundColor } = useSelector(
    (state) => state.noteStyle,
  );
  const isAlert = useSelector((state) => state.isAlert);
  const isDetails = useSelector((state) => state.isDetails);
  const detailsEditable = useSelector((state) => state.detailsEditable);
  const isMath = useSelector((state) => state.isMath);
  const isImage = useSelector((state) => state.isImage);
  const imageFilter = useSelector((state) => state.imageStyle.filter);
  const isNote = useSelector((state) => state.isNote);
  const isHorizontalRule = useSelector((state) => state.isHorizontalRule);
  const horizontalRuleVariant = useSelector((state) => state.horizontalRuleVariant);
  const isSelectionNullOrCollapsed = useSelector((state) => state.isSelectionNullOrCollapsed);
  const fontColor = useSelector((state) => state.fontColor);
  const bgColor = useSelector((state) => state.bgColor);
  const fontFamily = useSelector((state) => state.fontFamily);
  const formatType = useSelector((state) => state.elementFormat);
  const isPaged = useSelector((state) => state.pageSetup?.isPaged);
  const isPageHeader = useSelector((state) => state.isPageHeader);
  const isPageFooter = useSelector((state) => state.isPageFooter);
  const { updateEditorStoreState } = useActions();

  const isCodeBlock = blockType === 'code';

  const handleCutCallback = useCallback(() => {
    handleCut(editor);
  }, [editor]);

  const handleCopyCallback = useCallback(() => {
    handleCopy(editor);
  }, [editor]);

  const handlePasteCallback = useCallback(async () => {
    await handlePaste(editor);
  }, [editor]);

  const handlePastePlainTextCallback = useCallback(async () => {
    await handlePastePlainText(editor);
  }, [editor]);

  const handleImportCallback = useCallback(async () => {
    editor.dispatchCommand(ANNOUNCE_COMMAND, {
      id: toastId,
      type: 'loading',
      message: {
        title: 'Importing file',
        subtitle: 'Please wait while the file is imported',
      },
    });
    readTextFileFromSystem((text) => {
      try {
        const data = JSON.parse(text);
        if (!data.nodes) return;
        editor.update(() => {
          $importNodes({ nodes: data.nodes });
        });
        editor.dispatchCommand(ANNOUNCE_COMMAND, {
          id: toastId,
          type: 'success',
          message: {
            title: 'File imported successfully',
          },
        });
      } catch {
        const clipboardData = new DataTransfer();
        clipboardData.setData('text/plain', text);
        editor.dispatchCommand(PASTE_COMMAND, new ClipboardEvent('paste', { clipboardData }));
        editor.dispatchCommand(ANNOUNCE_COMMAND, {
          id: toastId,
          type: 'success',
          message: {
            title: 'File imported successfully',
          },
        });
      }
    });
  }, [editor, toastId]);

  const handleExportCallback = useCallback(async () => {
    editor.dispatchCommand(ANNOUNCE_COMMAND, {
      id: toastId,
      type: 'loading',
      message: {
        title: 'Exporting Selection',
      },
    });
    try {
      const nodes = await setSrcToDataUrl(editor.read($exportNodes), {
        getImageSignedUrl,
        getAttachmentSignedUrl,
      });
      exportBlob({ nodes });
      editor.dispatchCommand(ANNOUNCE_COMMAND, {
        id: toastId,
        type: 'success',
        message: {
          title: 'Selection exported successfully',
        },
      });
    } catch {
      editor.dispatchCommand(ANNOUNCE_COMMAND, {
        id: toastId,
        type: 'error',
        message: {
          title: 'Exporting selection failed',
        },
      });
    }
  }, [editor, toastId, getImageSignedUrl, getAttachmentSignedUrl]);

  const handleDeleteNodeCallback = useCallback(() => {
    handleDeleteNode(editor);
  }, [editor]);

  const openLinkDialog = () => updateEditorStoreState('openDialog', 'link');
  const removeLink = useCallback(() => {
    editor.update(() => {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    });
  }, [editor]);

  const mergeTableCells = () => {
    editor.dispatchCommand(MERGE_TABLE_CELLS_COMMAND, undefined);
  };

  const deleteTableRow = () => {
    editor.dispatchCommand(DELETE_TABLE_ROW_COMMAND, undefined);
  };

  const deleteTableColumn = () => {
    editor.dispatchCommand(DELETE_TABLE_COLUMN_COMMAND, undefined);
  };

  const insertTableRowBefore = () => {
    editor.dispatchCommand(INSERT_TABLE_ROW_COMMAND, false);
  };

  const insertTableRowAfter = () => {
    editor.dispatchCommand(INSERT_TABLE_ROW_COMMAND, true);
  };

  const insertTableColumnBefore = () => {
    editor.dispatchCommand(INSERT_TABLE_COLUMN_COMMAND, false);
  };

  const insertTableColumnAfter = () => {
    editor.dispatchCommand(INSERT_TABLE_COLUMN_COMMAND, true);
  };

  const toggleTableCellWritingMode = () => {
    editor.dispatchCommand(TOGGLE_TABLE_CELL_WRITING_MODE_COMMAND, undefined);
  };

  const toggleTableRowHeader = () => {
    editor.dispatchCommand(TOGGLE_TABLE_ROW_HEADER_COMMAND, undefined);
  };

  const toggleTableColumnHeader = () => {
    editor.dispatchCommand(TOGGLE_TABLE_COLUMN_HEADER_COMMAND, undefined);
  };

  const toggleTableRowStriping = () => {
    editor.dispatchCommand(TOGGLE_TABLE_ROW_STRIPING_COMMAND, undefined);
  };

  const handleContextMenu = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection) && !selection.isCollapsed()) return;
      const node = $getNearestNodeFromDOMNode(target);
      if (!node) return;
      if ($isImageNode(node)) return void node.selectEnd();
      if ($isHorizontalRuleNode(node) || $isPageBreakNode(node) || $isAttachmentNode(node)) {
        const nodeSelection = $createNodeSelection();
        $setSelection(nodeSelection);
        nodeSelection.add(node.getKey());
      }
      const detailsNode = $findMatchingParent(node, $isDetailsContainerNode);
      if (detailsNode) detailsNode.select();
    });
  };

  useEffect(() => {
    const editorElement = editor.getRootElement();
    if (!editorElement) return;
    editorElement.addEventListener('contextmenu', handleContextMenu);
    return () => editorElement.removeEventListener('contextmenu', handleContextMenu);
  }, [editor]);

  const onCloseAutoFocus = useCallback(
    (event: Event) => {
      event.preventDefault();
      restoreFocus(editor);
    },
    [editor],
  );

  const insertOptions = useMemo(
    () => [
      {
        icon: <AlertCircleIcon />,
        label: 'Alert',
        value: 'alert',
        shortcut: '/alert',
        func: () => editor.dispatchCommand(INSERT_ALERT_COMMAND, undefined),
      },
      {
        icon: <SeparatorHorizontalIcon />,
        label: 'Divider',
        value: 'divider',
        shortcut: '---',
        func: () => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined),
      },
      ...(isPaged && !isPageHeader && !isPageFooter
        ? [
            {
              icon: <FilePlus2Icon />,
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
              icon: <HashIcon />,
              label: 'Page Number',
              value: 'page-number',
              shortcut: '/pn',
              func: () => editor.dispatchCommand(INSERT_PAGE_NUMBER_COMMAND, 'current'),
            },
            {
              icon: <HashIcon />,
              label: 'Pages Count',
              value: 'pages-count',
              shortcut: '/pc',
              func: () => editor.dispatchCommand(INSERT_PAGE_NUMBER_COMMAND, 'total'),
            },
          ]
        : []),
      {
        icon: <FunctionSquareIcon />,
        label: 'Math',
        value: 'math',
        shortcut: '$$',
        func: () => editor.dispatchCommand(INSERT_MATH_COMMAND, { value: '' }),
      },

      {
        icon: <ImageIcon />,
        label: 'Image',
        value: 'image',
        shortcut: '/img',
        func: () => updateEditorStoreState('openDialog', 'image'),
      },

      {
        icon: <BrushIcon />,
        label: 'Sketch',
        value: 'sketch',
        shortcut: '/sketch',
        func: () => updateEditorStoreState('openDialog', 'sketch'),
      },

      {
        icon: <MusicIcon />,
        label: 'Score',
        value: 'score',
        shortcut: '/score',
        func: () => updateEditorStoreState('openDialog', 'score'),
      },

      {
        icon: <FileUpIcon />,
        label: 'Attachment',
        value: 'attachment',
        shortcut: '/file',
        func: () => updateEditorStoreState('openDialog', 'attachment'),
      },

      {
        icon: <TableIcon />,
        label: 'Table',
        value: 'table',
        shortcut: '/3x3',
        func: () => updateEditorStoreState('openDialog', 'table'),
      },

      {
        icon: <ColumnsIcon />,
        label: 'Columns',
        value: 'columns',
        shortcut: '/col',
        func: () => updateEditorStoreState('openDialog', 'layout'),
      },

      {
        icon: <StickyNoteIcon />,
        label: 'Note',
        value: 'note',
        shortcut: '/note',
        func: () => editor.dispatchCommand(INSERT_STICKY_COMMAND, undefined),
      },

      {
        icon: <GlobeIcon />,
        label: 'IFrame',
        value: 'iframe',
        shortcut: '/iframe',
        func: () => updateEditorStoreState('openDialog', 'iframe'),
      },

      {
        icon: <ExpandIcon />,
        label: 'Details',
        value: 'details',
        shortcut: '/details',
        func: () => editor.dispatchCommand(INSERT_DETAILS_COMMAND, undefined),
      },

      {
        icon: <YoutubeIcon />,
        label: 'Youtube',
        value: 'youtube',
        shortcut: '/youtube',
        func: () => updateEditorStoreState('openDialog', 'iframe'),
      },
    ],
    [editor, isPaged, isPageHeader, isPageFooter, updateEditorStoreState],
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent onCloseAutoFocus={onCloseAutoFocus}>
        {isLink && (
          <>
            <ContextMenuItem asChild>
              <a
                href={selectedLinkNode?.__url ?? ''}
                target={selectedLinkNode?.__target ?? '_blank'}
                rel="noopener noreferrer"
              >
                <ExternalLinkIcon />
                Open Link
              </a>
            </ContextMenuItem>
            <ContextMenuItem onClick={openLinkDialog}>
              <LinkIcon />
              Edit Link
              <ContextMenuShortcut>{SHORTCUTS.INSERT_LINK}</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={removeLink}>
              <UnlinkIcon />
              Remove Link
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        {isPaged && (isPageHeader || isPageFooter) && (
          <>
            <ContextMenuItem
              onClick={() => editor.dispatchCommand(INSERT_PAGE_NUMBER_COMMAND, 'current')}
            >
              <HashIcon />
              Insert Page Number
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => editor.dispatchCommand(INSERT_PAGE_NUMBER_COMMAND, 'total')}
            >
              <HashIcon />
              Insert Pages Count
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        {isTable && (
          <>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <TableIcon />
                Table Tools
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-60">
                {(canMergeTableCells || canUnmergeTableCell) && (
                  <ContextMenuItem onClick={mergeTableCells}>
                    <CellMergeIcon />
                    {canUnmergeTableCell ? 'Unmerge Cells' : 'Merge Cells'}
                  </ContextMenuItem>
                )}
                <ContextMenuItem onClick={toggleTableCellWritingMode}>
                  {tableCellWritingMode === '' ? (
                    <TextRotationVerticalIcon />
                  ) : (
                    <TextRotationNoneIcon />
                  )}
                  Make Writing {tableCellWritingMode === '' ? 'Vertical' : 'Horizontal'}
                </ContextMenuItem>
                <ContextMenuItem onClick={toggleTableRowStriping}>
                  <GripVerticalIcon className="size-4" style={{ transform: 'rotate(90deg)' }} />
                  {tableRowStriping ? 'Remove' : 'Add'} Row Striping
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={toggleTableRowHeader}>
                  <AddRowHeaderIcon />
                  {(tableCellHeaderState & TableCellHeaderStates.ROW) === TableCellHeaderStates.ROW
                    ? 'Remove'
                    : 'Add'}{' '}
                  Row Header
                </ContextMenuItem>
                <ContextMenuItem onClick={insertTableRowBefore}>
                  <AddRowAboveIcon />
                  Insert{' '}
                  {tableSelectionCounts.rows === 1
                    ? 'Row'
                    : `${tableSelectionCounts.rows} Rows`}{' '}
                  Above
                </ContextMenuItem>
                <ContextMenuItem onClick={insertTableRowAfter}>
                  <AddRowBelowIcon />
                  Insert{' '}
                  {tableSelectionCounts.rows === 1
                    ? 'Row'
                    : `${tableSelectionCounts.rows} Rows`}{' '}
                  Below
                </ContextMenuItem>
                <ContextMenuItem onClick={deleteTableRow}>
                  <RemoveRowIcon />
                  Delete{' '}
                  {tableSelectionCounts.rows === 1 ? 'Row' : `${tableSelectionCounts.rows} Rows`}
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={toggleTableColumnHeader}>
                  <AddColumnHeaderIcon />
                  {(tableCellHeaderState & TableCellHeaderStates.COLUMN) ===
                  TableCellHeaderStates.COLUMN
                    ? 'Remove'
                    : 'Add'}{' '}
                  Column Header
                </ContextMenuItem>
                <ContextMenuItem onClick={insertTableColumnBefore}>
                  <AddColumnLeftIcon />
                  Insert{' '}
                  {tableSelectionCounts.columns === 1
                    ? 'Column'
                    : `${tableSelectionCounts.columns} Columns`}{' '}
                  Left
                </ContextMenuItem>
                <ContextMenuItem onClick={insertTableColumnAfter}>
                  <AddColumnRightIcon />
                  Insert{' '}
                  {tableSelectionCounts.columns === 1
                    ? 'Column'
                    : `${tableSelectionCounts.columns} Columns`}{' '}
                  Right
                </ContextMenuItem>
                <ContextMenuItem onClick={deleteTableColumn}>
                  <RemoveColumnIcon />
                  Delete{' '}
                  {tableSelectionCounts.columns === 1
                    ? 'Column'
                    : `${tableSelectionCounts.columns} Columns`}
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <AlignJustifyIcon />
                Table Alignment
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-60">
                <ContextMenuItem
                  onClick={() => {
                    editor.dispatchCommand(ALIGN_TABLE_COMMAND, 'left');
                  }}
                >
                  <AlignLeftIcon />
                  Align Left
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => {
                    editor.dispatchCommand(ALIGN_TABLE_COMMAND, 'center');
                  }}
                >
                  <AlignCenterIcon />
                  Align Center
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => {
                    editor.dispatchCommand(ALIGN_TABLE_COMMAND, 'right');
                  }}
                >
                  <AlignRightIcon />
                  Align Right
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => {
                    editor.dispatchCommand(ALIGN_TABLE_COMMAND, 'justify');
                  }}
                >
                  <AlignJustifyIcon />
                  Align Justify
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onClick={() => {
                    editor.dispatchCommand(FLOAT_TABLE_COMMAND, 'left');
                  }}
                >
                  <FormatImageLeftIcon />
                  Float Left
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => {
                    editor.dispatchCommand(FLOAT_TABLE_COMMAND, 'right');
                  }}
                >
                  <FormatImageRightIcon />
                  Float Right
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <PaintbrushIcon />
                Table Color
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-50 p-0">
                <ColorPicker
                  isStatic={true}
                  tabs={['color', 'background-color', 'border-color']}
                  textColor={tableColor}
                  backgroundColor={tableBackgroundColor}
                  borderColor={tableBorderColor}
                  onColorChange={(key, value) => {
                    editor.dispatchCommand(UPDATE_TABLE_COLOR_COMMAND, {
                      key,
                      value,
                    });
                  }}
                />
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <SquareDashedTopSolidIcon />
                Table Border style
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                {['solid', 'dashed', 'dotted', 'double', 'none'].map((style) => (
                  <ContextMenuItem
                    key={style}
                    onClick={() => {
                      editor.dispatchCommand(UPDATE_TABLE_BORDER_STYLE_COMMAND, style);
                    }}
                  >
                    {style}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <SquareDashedTopSolidIcon />
                Table Border width
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                {['1px', '2px', '3px'].map((width) => (
                  <ContextMenuItem
                    key={width}
                    onClick={() => {
                      editor.dispatchCommand(UPDATE_TABLE_BORDER_WIDTH_COMMAND, width);
                    }}
                  >
                    {width}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <PaintbrushIcon />
                Table Cell Color
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-50 p-0">
                <ColorPicker
                  isStatic={true}
                  textColor={tableCellColor}
                  backgroundColor={tableCellBackgroundColor}
                  onColorChange={(key, value) => {
                    editor.dispatchCommand(UPDATE_TABLE_CELL_COLOR_COMMAND, {
                      key,
                      value,
                    });
                  }}
                />
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
          </>
        )}
        {isImage && (
          <>
            <ContextMenuItem
              onClick={() => {
                editor.dispatchCommand(TOGGLE_IMAGE_CAPTION_COMMAND, undefined);
              }}
            >
              <SubtitlesIcon />
              Toggle Caption
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => {
                editor.dispatchCommand(TOGGLE_IMAGE_FILTER_COMMAND, undefined);
              }}
            >
              <SunMoonIcon />
              {imageFilter === 'auto' ? 'Remove' : 'Add'} Dark Mode Filter
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <AlignJustifyIcon />
                Image Alignment
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-60">
                <ContextMenuItem
                  onClick={() => {
                    editor.dispatchCommand(FLOAT_IMAGE_COMMAND, 'left');
                  }}
                >
                  <FormatImageLeftIcon />
                  Float Left
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => {
                    editor.dispatchCommand(FLOAT_IMAGE_COMMAND, 'none');
                  }}
                >
                  <AlignJustifyIcon />
                  No Float
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => {
                    editor.dispatchCommand(FLOAT_IMAGE_COMMAND, 'right');
                  }}
                >
                  <FormatImageRightIcon />
                  Float Right
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
          </>
        )}
        {isNote && (
          <>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <AlignJustifyIcon />
                Note Alignment
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-60">
                <ContextMenuItem
                  onClick={() => {
                    editor.dispatchCommand(FLOAT_NOTE_COMMAND, 'left');
                  }}
                >
                  <FormatImageLeftIcon />
                  Float Left
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => {
                    editor.dispatchCommand(FLOAT_NOTE_COMMAND, 'right');
                  }}
                >
                  <FormatImageRightIcon />
                  Float Right
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <PaintbrushIcon />
                Note Color
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-50 p-0">
                <ColorPicker
                  isStatic={true}
                  textColor={noteColor}
                  backgroundColor={noteBackgroundColor}
                  onColorChange={(key, value) => {
                    editor.dispatchCommand(UPDATE_NOTE_COLOR_COMMAND, {
                      key,
                      value,
                    });
                  }}
                />
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
          </>
        )}
        {isAlert && (
          <>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <AlertCircleIcon />
                Alert Style
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-60">
                <ContextMenuItem
                  onClick={() => {
                    editor.dispatchCommand(UPDATE_ALERT_VARIANT_COMMAND, 'default');
                  }}
                >
                  <AlertCircleIcon />
                  Default
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => {
                    editor.dispatchCommand(UPDATE_ALERT_VARIANT_COMMAND, 'success');
                  }}
                >
                  <CheckCircleIcon />
                  Success
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => {
                    editor.dispatchCommand(UPDATE_ALERT_VARIANT_COMMAND, 'error');
                  }}
                >
                  <XCircleIcon />
                  Error
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => {
                    editor.dispatchCommand(UPDATE_ALERT_VARIANT_COMMAND, 'warning');
                  }}
                >
                  <AlertTriangleIcon />
                  Warning
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => {
                    editor.dispatchCommand(UPDATE_ALERT_VARIANT_COMMAND, 'info');
                  }}
                >
                  <InfoIcon />
                  Info
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
          </>
        )}
        {isHorizontalRule && (
          <>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <HorizontalRuleIcon variant={horizontalRuleVariant} />
                Divider Style
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-60">
                <ContextMenuItem
                  onClick={() => {
                    editor.dispatchCommand(UPDATE_HORIZONTAL_RULE_VARIANT_COMMAND, 'single');
                  }}
                >
                  <HorizontalRuleIcon variant="single" />
                  Single line
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => {
                    editor.dispatchCommand(UPDATE_HORIZONTAL_RULE_VARIANT_COMMAND, 'dashed');
                  }}
                >
                  <HorizontalRuleIcon variant="dashed" />
                  Dashed line
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => {
                    editor.dispatchCommand(UPDATE_HORIZONTAL_RULE_VARIANT_COMMAND, 'dotted');
                  }}
                >
                  <HorizontalRuleIcon variant="dotted" />
                  Dotted line
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => {
                    editor.dispatchCommand(UPDATE_HORIZONTAL_RULE_VARIANT_COMMAND, 'double');
                  }}
                >
                  <HorizontalRuleIcon variant="double" />
                  Double line
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
          </>
        )}
        {isDetails && (
          <>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <ExpandIcon />
                Details Style
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-60">
                <ContextMenuItem
                  onClick={() => {
                    editor.dispatchCommand(UPDATE_DETAILS_VARIANT_COMMAND, 'sharp');
                  }}
                >
                  <DetailsVariantIcon variant="sharp" />
                  Sharp corners
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => {
                    editor.dispatchCommand(UPDATE_DETAILS_VARIANT_COMMAND, 'rounded');
                  }}
                >
                  <DetailsVariantIcon variant="rounded" />
                  Rounded corners
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuItem
              onClick={() => {
                editor.dispatchCommand(TOGGLE_DETAILS_EDITABLE_COMMAND, undefined);
              }}
            >
              <DetailsEditableIcon editable={detailsEditable} />
              {detailsEditable ? 'Make Read-only' : 'Make Editable'}
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        {isMath && (
          <>
            <ContextMenuItem
              onClick={() => {
                editor.dispatchCommand(OPEN_MATH_EDIT_DIALOG_COMMAND, undefined);
              }}
            >
              <EditIcon />
              Edit LaTeX
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => {
                editor.dispatchCommand(OPEN_WOLFRAM_COMMAND, undefined);
              }}
            >
              <WolframIcon />
              Open in Wolfram Alpha
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <PaintbrushIcon />
                Math Color
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-50 p-0">
                <ColorPicker
                  isStatic={true}
                  textColor={fontColor}
                  backgroundColor={bgColor}
                  onColorChange={(key, value) => {
                    editor.dispatchCommand(UPDATE_MATH_COLOR_COMMAND, {
                      key,
                      value,
                    });
                  }}
                />
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
          </>
        )}
        {isCodeBlock && (
          <>
            <ContextMenuItem onClick={() => editor.dispatchCommand(COPY_CODE_COMMAND, undefined)}>
              <CopyIcon />
              Copy Code
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <FileTextIcon />
                Code Language
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-60">
                {CODE_LANGUAGE_OPTIONS.map(([option, text]) => (
                  <ContextMenuItem
                    key={option}
                    onClick={() => {
                      editor.dispatchCommand(UPDATE_CODE_LANGUAGE_COMMAND, option);
                    }}
                  >
                    {text}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <BlockTypeIcon type={blockType} />
            Block Type
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-64">
            <ContextMenuItem
              onClick={() => editor.dispatchCommand(SET_BLOCK_TYPE_COMMAND, 'paragraph')}
            >
              <BlockTypeIcon type="paragraph" />
              Normal
              <ContextMenuShortcut>{SHORTCUTS.NORMAL}</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => editor.dispatchCommand(SET_BLOCK_TYPE_COMMAND, 'h1')}>
              <BlockTypeIcon type="h1" />
              Heading 1<ContextMenuShortcut>{SHORTCUTS.HEADING1}</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => editor.dispatchCommand(SET_BLOCK_TYPE_COMMAND, 'h2')}>
              <BlockTypeIcon type="h2" />
              Heading 2<ContextMenuShortcut>{SHORTCUTS.HEADING2}</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => editor.dispatchCommand(SET_BLOCK_TYPE_COMMAND, 'h3')}>
              <BlockTypeIcon type="h3" />
              Heading 3<ContextMenuShortcut>{SHORTCUTS.HEADING3}</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => editor.dispatchCommand(SET_BLOCK_TYPE_COMMAND, 'h4')}>
              <BlockTypeIcon type="h4" />
              Heading 4<ContextMenuShortcut>{SHORTCUTS.HEADING4}</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => editor.dispatchCommand(SET_BLOCK_TYPE_COMMAND, 'h5')}>
              <BlockTypeIcon type="h5" />
              Heading 5<ContextMenuShortcut>{SHORTCUTS.HEADING5}</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => editor.dispatchCommand(SET_BLOCK_TYPE_COMMAND, 'h6')}>
              <BlockTypeIcon type="h6" />
              Heading 6<ContextMenuShortcut>{SHORTCUTS.HEADING6}</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => editor.dispatchCommand(SET_BLOCK_TYPE_COMMAND, 'number')}
            >
              <BlockTypeIcon type="number" />
              Numbered list
              <ContextMenuShortcut>{SHORTCUTS.NUMBERED_LIST}</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => editor.dispatchCommand(SET_BLOCK_TYPE_COMMAND, 'bullet')}
            >
              <BlockTypeIcon type="bullet" />
              Bullet List
              <ContextMenuShortcut>{SHORTCUTS.BULLET_LIST}</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => editor.dispatchCommand(SET_BLOCK_TYPE_COMMAND, 'check')}
            >
              <BlockTypeIcon type="check" />
              Check box
              <ContextMenuShortcut>{SHORTCUTS.CHECK_LIST}</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => editor.dispatchCommand(SET_BLOCK_TYPE_COMMAND, 'code')}>
              <BlockTypeIcon type="code" />
              Code
              <ContextMenuShortcut>{SHORTCUTS.CODE_BLOCK}</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => editor.dispatchCommand(SET_BLOCK_TYPE_COMMAND, 'quote')}
            >
              <BlockTypeIcon type="quote" />
              Blockquote
              <ContextMenuShortcut>{SHORTCUTS.QUOTE}</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger disabled={blockType === 'code'}>
            <span className="text-xs text-muted-foreground" style={{ fontFamily: fontFamily }}>
              Aa
            </span>
            Font Family
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-64">
            {Object.entries(fontFamilyToFriendlyName).map(([option, text]) => (
              <ContextMenuItem
                key={option}
                style={{ fontFamily: option }}
                onClick={() => editor.dispatchCommand(SET_FONT_FAMILY_COMMAND, option)}
              >
                <span>Aa</span>
                {text}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger disabled={blockType === 'code'}>
            <TypeIcon />
            Font Size
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-20 min-w-full">
            {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72].map((s) => (
              <ContextMenuItem
                key={s}
                onClick={() => editor.dispatchCommand(SET_FONT_SIZE_COMMAND, String(s) + 'px')}
              >
                {String(s)}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <PlusIcon />
            Insert
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-60">
            {insertOptions.map((option) => (
              <ContextMenuItem key={option.value} onClick={option.func}>
                {option.icon}
                {option.label}
                <ContextMenuShortcut>{option.shortcut}</ContextMenuShortcut>
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <TextAlignIcon formatType={formatType} />
            Text Alignment
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-60">
            <ContextMenuItem
              onClick={() => {
                editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
              }}
            >
              <AlignLeftIcon />
              Align Left
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => {
                editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
              }}
            >
              <AlignCenterIcon />
              Align Center
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => {
                editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
              }}
            >
              <AlignRightIcon />
              Align Right
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => {
                editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
              }}
            >
              <AlignJustifyIcon />
              Align Justify
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        {!isSelectionNullOrCollapsed && (
          <>
            <ContextMenuItem onClick={handleCutCallback}>
              <ScissorsIcon />
              Cut
              <ContextMenuShortcut>{SHORTCUTS.CUT}</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={handleCopyCallback}>
              <CopyIcon />
              Copy
              <ContextMenuShortcut>{SHORTCUTS.COPY}</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={handleExportCallback}>
              <FileDownIcon />
              Export Selection
            </ContextMenuItem>
          </>
        )}
        <ContextMenuItem onClick={handlePasteCallback}>
          <ClipboardIcon />
          Paste
          <ContextMenuShortcut>{SHORTCUTS.PASTE}</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={handlePastePlainTextCallback}>
          <FileTextIcon />
          Paste as Plain Text
          <ContextMenuShortcut>{SHORTCUTS.PASTE_PLAIN_TEXT}</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleImportCallback}>
          <FileUpIcon />
          Import File
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleDeleteNodeCallback} variant="destructive">
          <Trash2Icon />
          Delete Node
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
