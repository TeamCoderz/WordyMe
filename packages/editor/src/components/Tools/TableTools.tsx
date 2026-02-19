/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';
import {
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_CRITICAL,
  ElementFormatType,
  ElementNode,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import {
  $deleteTableColumnAtSelection,
  $deleteTableRowAtSelection,
  $getNodeTriplet,
  $getTableColumnIndexFromTableCellNode,
  $getTableRowIndexFromTableCellNode,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  $isTableCellNode,
  $isTableRowNode,
  $isTableSelection,
  $mergeCells,
  $unmergeCell,
  TableCellHeaderStates,
  TableCellNode,
  TableNode,
  TableRowNode,
  TableSelection,
} from '@repo/editor/nodes/TableNode';
import { $getNodeStyleValueForProperty, $patchStyle } from '@repo/editor/utils/nodeUtils';
import ColorPicker from '@repo/editor/components/color-picker';

import { ToggleGroup, ToggleGroupItem } from '@repo/ui/components/toggle-group';
import {
  AddColumnHeaderIcon,
  AddColumnLeftIcon,
  AddColumnRightIcon,
  AddRowAboveIcon,
  AddRowBelowIcon,
  AddRowHeaderIcon,
  CellMergeIcon,
  FormatImageLeftIcon,
  FormatImageRightIcon,
  RemoveColumnIcon,
  RemoveRowIcon,
  TextRotationVerticalIcon,
} from '@repo/editor/components/icons';
import {
  Trash2Icon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  AlignJustifyIcon,
  GripVerticalIcon,
  SquareDashedTopSolidIcon,
} from '@repo/ui/components/icons';
import { createPortal } from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  DELETE_TABLE_COLUMN_COMMAND,
  DELETE_TABLE_ROW_COMMAND,
  INSERT_TABLE_COLUMN_COMMAND,
  INSERT_TABLE_ROW_COMMAND,
  MERGE_TABLE_CELLS_COMMAND,
  TOGGLE_TABLE_CELL_WRITING_MODE_COMMAND,
  TOGGLE_TABLE_ROW_HEADER_COMMAND,
  TOGGLE_TABLE_COLUMN_HEADER_COMMAND,
  TOGGLE_TABLE_ROW_STRIPING_COMMAND,
  ALIGN_TABLE_COMMAND,
  FLOAT_TABLE_COMMAND,
  UPDATE_TABLE_CELL_COLOR_COMMAND,
  UPDATE_TABLE_COLOR_COMMAND,
  UPDATE_TABLE_BORDER_STYLE_COMMAND,
  UPDATE_TABLE_BORDER_WIDTH_COMMAND,
} from '@repo/editor/commands';
import { mergeRegister } from '@lexical/utils';
import { useSelector, useActions } from '@repo/editor/store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';

const anchorPolyfill = async (elements: HTMLElement[]) => {
  if (!('anchorName' in document.documentElement.style)) {
    const { default: polyfill } = await import('@oddbird/css-anchor-positioning/fn');

    polyfill({
      elements,
      excludeInlineStyles: false,
      useAnimationFrame: false,
    });
  }
};

function computeSelectionCount(selection: TableSelection): {
  columns: number;
  rows: number;
} {
  const selectionShape = selection.getShape();
  return {
    columns: selectionShape.toX - selectionShape.fromX + 1,
    rows: selectionShape.toY - selectionShape.fromY + 1,
  };
}

function $canUnmerge(): boolean {
  const selection = $getSelection();
  if (
    ($isRangeSelection(selection) && !selection.isCollapsed()) ||
    ($isTableSelection(selection) && !selection.anchor.is(selection.focus)) ||
    (!$isRangeSelection(selection) && !$isTableSelection(selection))
  ) {
    return false;
  }
  try {
    const [cell] = $getNodeTriplet(selection.anchor);
    return cell.__colSpan > 1 || cell.__rowSpan > 1;
  } catch {
    return false;
  }
}

function $selectLastDescendant(node: ElementNode): void {
  const lastDescendant = node.getLastDescendant();
  if ($isTextNode(lastDescendant)) {
    lastDescendant.select();
  } else if ($isElementNode(lastDescendant)) {
    lastDescendant.selectEnd();
  } else if (lastDescendant !== null) {
    lastDescendant.selectNext();
  }
}

const $getSelectedTableCells = (): TableCellNode[] => {
  const selection = $getSelection();
  if (!($isRangeSelection(selection) || $isTableSelection(selection))) {
    return [];
  }
  if ($isTableSelection(selection)) {
    return selection.getNodes().filter($isTableCellNode);
  }
  try {
    const [cell] = $getNodeTriplet(selection.anchor);
    if ($isTableCellNode(cell)) {
      return [cell];
    }
    return [];
  } catch {
    return [];
  }
};

function TableTools({ node }: { node: TableNode }) {
  const [editor] = useLexicalComposerContext();
  const canMergeTableCells = useSelector((state) => state.canMergeTableCells);
  const canUnmergeTableCell = useSelector((state) => state.canUnmergeTableCell);
  const tableSelectionCounts = useSelector((state) => state.tableSelectionCounts);
  const tableStyle = useSelector((state) => state.tableStyle);
  const tableCellStyle = useSelector((state) => state.tableCellStyle);
  const tableCellHeaderState = useSelector((state) => state.tableCellHeaderState);
  const tableRowStriping = useSelector((state) => state.tableRowStriping);
  const { updateEditorStoreState } = useActions();

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    // Merge cells
    if ($isTableSelection(selection)) {
      const currentSelectionCounts = computeSelectionCount(selection);
      updateEditorStoreState('tableSelectionCounts', currentSelectionCounts);
      updateEditorStoreState(
        'canMergeTableCells',
        currentSelectionCounts.columns > 1 || currentSelectionCounts.rows > 1,
      );
    } else {
      updateEditorStoreState('tableSelectionCounts', { columns: 1, rows: 1 });
      updateEditorStoreState('canMergeTableCells', false);
    }
    // Unmerge cell
    updateEditorStoreState('canUnmergeTableCell', $canUnmerge());

    if (node.isAttached()) {
      const float = $getNodeStyleValueForProperty(node, 'float', 'none');
      const borderStyle = $getNodeStyleValueForProperty(node, 'border-style', 'solid');
      const borderWidth = $getNodeStyleValueForProperty(node, 'border-width', '1px');
      const borderColor = $getNodeStyleValueForProperty(node, 'border-color', '');
      const formatType = node.getFormatType() || (float !== 'none' ? '' : 'justify');
      const backgroundColor = $getNodeStyleValueForProperty(node, 'background-color', '');
      const color = $getNodeStyleValueForProperty(node, 'color', '');
      updateEditorStoreState('tableStyle', {
        float: float as 'none' | 'left' | 'right',
        formatType: formatType,
        borderStyle: borderStyle,
        borderWidth: borderWidth,
        borderColor: borderColor,
        backgroundColor: backgroundColor,
        color: color,
      });
      updateEditorStoreState('tableRowStriping', node.getRowStriping());
    }

    const tableCell = $getSelectedTableCells()[0];

    if (tableCell?.isAttached()) {
      const writingMode = $getNodeStyleValueForProperty(tableCell, 'writing-mode', '');
      const backgroundColor = $getNodeStyleValueForProperty(tableCell, 'background-color', '');
      const color = $getNodeStyleValueForProperty(tableCell, 'color', '');
      updateEditorStoreState('tableCellStyle', {
        writingMode: writingMode as '' | 'vertical-rl',
        backgroundColor: backgroundColor,
        color: color,
      });

      const cellHeaderState = tableCell.getHeaderStyles();
      updateEditorStoreState('tableCellHeaderState', cellHeaderState);
    }
  }, [editor, node, updateEditorStoreState]);

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      editor.read(() => {
        $updateToolbar();
      });
    });
  }, [editor, $updateToolbar]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        $updateToolbar();
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
  }, [editor, $updateToolbar]);

  const mergeTableCellsAtSelection = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isTableSelection(selection)) {
        return;
      }

      const nodes = selection.getNodes();
      const tableCells = nodes.filter($isTableCellNode);
      const targetCell = $mergeCells(tableCells);

      if (targetCell) {
        $selectLastDescendant(targetCell);
      }
    });
  };

  const unmergeTableCellsAtSelection = () => {
    editor.update(() => {
      $unmergeCell();
    });
  };

  const handleCellMerge = useCallback(() => {
    if (canUnmergeTableCell) {
      unmergeTableCellsAtSelection();
    } else {
      mergeTableCellsAtSelection();
    }
  }, [canUnmergeTableCell, mergeTableCellsAtSelection, unmergeTableCellsAtSelection]);

  const insertTableRowAtSelection = useCallback(
    (shouldInsertAfter: boolean) => {
      editor.update(() => {
        for (let i = 0; i < tableSelectionCounts.rows; i++) {
          const row = $insertTableRowAtSelection(shouldInsertAfter);
          if (i === 0) row?.selectStart();
        }
      });
    },
    [editor, tableSelectionCounts.rows],
  );

  const insertTableColumnAtSelection = useCallback(
    (shouldInsertAfter: boolean) => {
      editor.update(() => {
        for (let i = 0; i < tableSelectionCounts.columns; i++) {
          const col = $insertTableColumnAtSelection(shouldInsertAfter);
          if (i === 0) col?.selectStart();
        }
      });
    },
    [editor, tableSelectionCounts.columns],
  );
  const deleteTableRowAtSelection = useCallback(() => {
    editor.update(() => {
      $deleteTableRowAtSelection();
    });
  }, [editor]);

  const deleteTableAtSelection = useCallback(() => {
    if (node === null) return;
    editor.update(() => {
      node.selectPrevious();
      node.remove();
    });
  }, [editor, node]);

  const deleteTableColumnAtSelection = useCallback(() => {
    editor.update(() => {
      $deleteTableColumnAtSelection();
    });
  }, [editor]);

  const toggleTableRowIsHeader = useCallback(() => {
    editor.update(() => {
      const selectedCells = $getSelectedTableCells();
      selectedCells.forEach((tableCell) => {
        const tableRowIndex = $getTableRowIndexFromTableCellNode(tableCell as any);

        const tableRows = node.getChildren();

        if (tableRowIndex >= tableRows.length || tableRowIndex < 0) {
          throw new Error('Expected table cell to be inside of table row.');
        }

        const tableRow = tableRows[tableRowIndex];

        if (!$isTableRowNode(tableRow)) {
          throw new Error('Expected table row');
        }

        const newStyle = tableCellHeaderState ^ TableCellHeaderStates.ROW;
        tableRow.getChildren().forEach((tableCell) => {
          if (!$isTableCellNode(tableCell)) {
            throw new Error('Expected table cell');
          }

          tableCell.setHeaderStyles(newStyle, TableCellHeaderStates.ROW);
        });
      });
    });
  }, [editor, node, tableCellHeaderState]);

  const toggleTableColumnIsHeader = useCallback(() => {
    editor.update(() => {
      const selectedCells = $getSelectedTableCells();
      selectedCells.forEach((tableCell) => {
        const tableColumnIndex = $getTableColumnIndexFromTableCellNode(tableCell as any);

        const tableRows = node.getChildren<TableRowNode>();
        const maxRowsLength = Math.max(...tableRows.map((row) => row.getChildren().length));

        if (tableColumnIndex >= maxRowsLength || tableColumnIndex < 0) {
          throw new Error('Expected table cell to be inside of table row.');
        }

        const newStyle = tableCellHeaderState ^ TableCellHeaderStates.COLUMN;
        for (let r = 0; r < tableRows.length; r++) {
          const tableRow = tableRows[r];

          if (!$isTableRowNode(tableRow)) {
            throw new Error('Expected table row');
          }

          const tableCells = tableRow.getChildren();
          if (tableColumnIndex >= tableCells.length) {
            // if cell is outside of bounds for the current row (for example various merge cell cases) we shouldn't highlight it
            continue;
          }

          const tableCell = tableCells[tableColumnIndex];

          if (!$isTableCellNode(tableCell)) {
            throw new Error('Expected table cell');
          }

          tableCell.setHeaderStyles(newStyle, TableCellHeaderStates.COLUMN);
        }
      });
    });
  }, [editor, node, tableCellHeaderState]);

  const toggleRowStriping = useCallback(() => {
    editor.update(() => {
      if (!node.isAttached()) return;
      node.setRowStriping(!node.getRowStriping());
    });
  }, [editor, node]);

  const applyCellStyle = useCallback(
    (styles: Record<string, string | null>) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection) || $isTableSelection(selection)) {
          const [cell] = $getNodeTriplet(selection.anchor);
          if ($isTableCellNode(cell)) {
            $patchStyle(cell, styles);
          }

          if ($isTableSelection(selection)) {
            const nodes = selection.getNodes();
            const cells = nodes.filter($isTableCellNode);
            $patchStyle(cells, styles);
          }
        }
      });
    },
    [editor],
  );

  const updateCellColor = useCallback(
    (key: string, value: string | null) => {
      applyCellStyle({ [key]: value });
    },
    [applyCellStyle],
  );

  const toggleCellWritingMode = useCallback(() => {
    const value = tableCellStyle.writingMode === '' ? 'vertical-rl' : '';
    applyCellStyle({ 'writing-mode': value });
  }, [applyCellStyle, tableCellStyle.writingMode]);

  function updateFloat(newFloat: 'left' | 'right' | 'none') {
    editor.update(() => {
      node.setFormat('');
      $patchStyle(node, { float: newFloat });
    });
  }

  function updateFormat(newFormat: ElementFormatType) {
    if (!newFormat) return;
    editor.update(() => {
      node.setFormat(newFormat);
      $patchStyle(node, { float: 'none' });
    });
  }

  const updateTableBorderStyle = useCallback(
    (style: string) => {
      if (!style) return;
      editor.update(() => {
        if (!node.isAttached()) return;
        $patchStyle(node, {
          'border-style': style,
        });
      });
    },
    [editor, node],
  );

  const updateTableBorderWidth = useCallback(
    (width: string) => {
      if (!width) return;
      editor.update(() => {
        if (!node.isAttached()) return;
        $patchStyle(node, { 'border-width': width });
      });
    },
    [editor, node],
  );

  const updateTableColor = useCallback(
    (key: string, value: string | null) => {
      editor.update(() => {
        if (!node.isAttached()) return;
        $patchStyle(node, {
          [key]: value,
        });
      });
    },
    [editor, node],
  );

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        MERGE_TABLE_CELLS_COMMAND,
        () => {
          handleCellMerge();
          return true;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        DELETE_TABLE_ROW_COMMAND,
        () => {
          deleteTableRowAtSelection();
          return true;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        DELETE_TABLE_COLUMN_COMMAND,
        () => {
          deleteTableColumnAtSelection();
          return true;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        INSERT_TABLE_ROW_COMMAND,
        (shouldInsertAfter: boolean) => {
          insertTableRowAtSelection(shouldInsertAfter);
          return true;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        INSERT_TABLE_COLUMN_COMMAND,
        (shouldInsertAfter: boolean) => {
          insertTableColumnAtSelection(shouldInsertAfter);
          return true;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        TOGGLE_TABLE_CELL_WRITING_MODE_COMMAND,
        () => {
          toggleCellWritingMode();
          return true;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        TOGGLE_TABLE_ROW_HEADER_COMMAND,
        () => {
          toggleTableRowIsHeader();
          return true;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        TOGGLE_TABLE_COLUMN_HEADER_COMMAND,
        () => {
          toggleTableColumnIsHeader();
          return true;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        TOGGLE_TABLE_ROW_STRIPING_COMMAND,
        () => {
          toggleRowStriping();
          return true;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        ALIGN_TABLE_COMMAND,
        (newFormat: ElementFormatType) => {
          updateFormat(newFormat);
          return true;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        FLOAT_TABLE_COMMAND,
        (newFloat: 'left' | 'right' | 'none') => {
          updateFloat(newFloat);
          return true;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        UPDATE_TABLE_CELL_COLOR_COMMAND,
        ({ key, value }: { key: string; value: string }) => {
          updateCellColor(key, value);
          return true;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        UPDATE_TABLE_COLOR_COMMAND,
        ({ key, value }: { key: string; value: string }) => {
          updateTableColor(key, value);
          return true;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        UPDATE_TABLE_BORDER_STYLE_COMMAND,
        (value: string) => {
          updateTableBorderStyle(value);
          return true;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        UPDATE_TABLE_BORDER_WIDTH_COMMAND,
        (value: string) => {
          updateTableBorderWidth(value);
          return true;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    );
  }, [
    editor,
    handleCellMerge,
    deleteTableRowAtSelection,
    deleteTableColumnAtSelection,
    toggleCellWritingMode,
    toggleTableRowIsHeader,
    toggleTableColumnIsHeader,
    toggleRowStriping,
    updateFormat,
    updateFloat,
    updateCellColor,
    updateTableColor,
    updateTableBorderStyle,
    updateTableBorderWidth,
  ]);

  const tableToolbarRef = useRef<HTMLDivElement | null>(null);
  const tableCellToolbarRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const tableToolbarElem = tableToolbarRef.current;
    if (tableToolbarElem === null) return;
    const tableElement = editor.getElementByKey(node.getKey());
    if (tableElement === null) return;

    (tableElement.style as any).anchorName = `--table-anchor-${node.getKey()}`;
    tableToolbarElem.setAttribute(
      'style',
      `position-anchor: --table-anchor-${node.getKey()}; bottom: calc(anchor(top) + 0.25rem); justify-self: anchor-center;`,
    );

    anchorPolyfill([tableElement, tableToolbarElem]);
  }, [node, editor]);

  useLayoutEffect(() => {
    editor.read(() => {
      const selection = $getSelection();
      if (!$isTableSelection(selection)) return false;
      const selectedCells = $getSelectedTableCells();
      if (selectedCells.length === 0) return false;

      const tableCellToolbarElem = tableCellToolbarRef.current;
      if (tableCellToolbarElem === null) return false;

      const tableCell = selectedCells[selectedCells.length - 1];
      if (!tableCell) return false;
      const tableCellKey = tableCell.getKey();
      const tableCellElement = editor.getElementByKey(tableCellKey);
      if (tableCellElement === null) return false;

      (tableCellElement.style as any).anchorName = `--table-cell-anchor-${tableCellKey}`;

      tableCellToolbarElem.setAttribute(
        'style',
        `position-anchor: --table-cell-anchor-${tableCellKey}; top: calc(anchor(bottom) + 0.25rem); justify-self: anchor-center`,
      );

      anchorPolyfill([tableCellElement, tableCellToolbarElem]);
      return false;
    });
  }, [editor, tableSelectionCounts]);

  return (
    <>
      <div
        ref={tableToolbarRef}
        className="table-toolbar flex px-4 absolute z-30 will-change-transform print:hidden gap-1"
      >
        <ToggleGroup
          type="single"
          variant="outline"
          className="bg-background"
          value={tableStyle.formatType}
          onValueChange={updateFormat}
        >
          <ToggleGroupItem value="left" aria-label="Align left" title="Align left">
            <AlignLeftIcon className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="center" aria-label="Align center" title="Align center">
            <AlignCenterIcon className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="right" aria-label="Align right" title="Align right">
            <AlignRightIcon className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="justify" aria-label="Align justify" title="Align justify">
            <AlignJustifyIcon className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup
          type="single"
          variant="outline"
          className="bg-background"
          value={tableStyle.float}
        >
          <ToggleGroupItem
            value="left"
            aria-label="Float left"
            title="Float left"
            onClick={() => updateFloat('left')}
          >
            <FormatImageLeftIcon />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="right"
            aria-label="Float right"
            title="Float right"
            onClick={() => updateFloat('right')}
          >
            <FormatImageRightIcon />
          </ToggleGroupItem>
        </ToggleGroup>

        <ColorPicker
          tabs={['color', 'background-color', 'border-color']}
          onColorChange={updateTableColor}
          textColor={tableStyle.color}
          borderColor={tableStyle.borderColor}
          backgroundColor={tableStyle.backgroundColor}
          aria-label="Table color"
          title="Table color"
        />

        <ToggleGroup type="single" value="" variant="outline" className="bg-background">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <ToggleGroupItem value="border-style" aria-label="Border style" title="Border style">
                <SquareDashedTopSolidIcon />
              </ToggleGroupItem>
            </DropdownMenuTrigger>
            <DropdownMenuContent sideOffset={6}>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Border Style</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    onValueChange={updateTableBorderStyle}
                    value={tableStyle.borderStyle}
                  >
                    <DropdownMenuRadioItem value="none">None</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="solid">Solid</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dashed">Dashed</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dotted">Dotted</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="double">Double</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Border Width</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    onValueChange={updateTableBorderWidth}
                    value={tableStyle.borderWidth}
                  >
                    <DropdownMenuRadioItem value="1px">1 px</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="2px">2 px</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="3px">3 px</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Border Color</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-50 p-0">
                  <ColorPicker
                    isStatic={true}
                    onColorChange={updateTableColor}
                    tabs={['border-color']}
                    borderColor={tableStyle.borderColor}
                  />
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
          <ToggleGroupItem
            value="row-striping"
            onClick={toggleRowStriping}
            data-state={tableRowStriping ? 'on' : 'off'}
            aria-label={`${tableRowStriping ? 'Remove' : 'Add'} row striping`}
            title={`${tableRowStriping ? 'Remove' : 'Add'} row striping`}
          >
            <GripVerticalIcon className="size-4" style={{ transform: 'rotate(90deg)' }} />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="delete-table"
            onClick={deleteTableAtSelection}
            aria-label="Delete Table"
            title="Delete Table"
          >
            <Trash2Icon className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div
        ref={tableCellToolbarRef}
        className="table-cell-toolbar flex px-4 absolute z-30 will-change-transform print:hidden gap-1"
      >
        <ToggleGroup type="multiple" variant="outline" className="bg-background">
          {(canMergeTableCells || canUnmergeTableCell) && (
            <ToggleGroupItem
              value="merge"
              data-state={canUnmergeTableCell ? 'on' : 'off'}
              onClick={handleCellMerge}
              aria-label={canUnmergeTableCell ? 'Unmerge cells' : 'Merge cells'}
              title={canUnmergeTableCell ? 'Unmerge cells' : 'Merge cells'}
            >
              <CellMergeIcon />
            </ToggleGroupItem>
          )}
          <ToggleGroupItem
            value="writing-mode"
            data-state={tableCellStyle.writingMode === '' ? 'off' : 'on'}
            onClick={toggleCellWritingMode}
            aria-label={`Make Writing ${tableCellStyle.writingMode === '' ? 'Vertical' : 'Horizontal'}`}
            title={`Make Writing ${tableCellStyle.writingMode === '' ? 'Vertical' : 'Horizontal'}`}
          >
            <TextRotationVerticalIcon />
          </ToggleGroupItem>
        </ToggleGroup>

        <ToggleGroup type="multiple" variant="outline" className="bg-background">
          <ToggleGroupItem
            value="row-header"
            onClick={toggleTableRowIsHeader}
            data-state={
              (tableCellHeaderState & TableCellHeaderStates.ROW) === TableCellHeaderStates.ROW
                ? 'on'
                : 'off'
            }
            aria-label={`${
              (tableCellHeaderState & TableCellHeaderStates.ROW) === TableCellHeaderStates.ROW
                ? 'Remove'
                : 'Add'
            } row header`}
            title={`${
              (tableCellHeaderState & TableCellHeaderStates.ROW) === TableCellHeaderStates.ROW
                ? 'Remove'
                : 'Add'
            } row header`}
          >
            <AddRowHeaderIcon />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="column-header"
            onClick={toggleTableColumnIsHeader}
            data-state={
              (tableCellHeaderState & TableCellHeaderStates.COLUMN) === TableCellHeaderStates.COLUMN
                ? 'on'
                : 'off'
            }
            aria-label={`${
              (tableCellHeaderState & TableCellHeaderStates.COLUMN) === TableCellHeaderStates.COLUMN
                ? 'Remove'
                : 'Add'
            } column header`}
            title={`${
              (tableCellHeaderState & TableCellHeaderStates.COLUMN) === TableCellHeaderStates.COLUMN
                ? 'Remove'
                : 'Add'
            } column header`}
          >
            <AddColumnHeaderIcon />
          </ToggleGroupItem>
        </ToggleGroup>

        <ColorPicker
          onColorChange={updateCellColor}
          textColor={tableCellStyle.color}
          backgroundColor={tableCellStyle.backgroundColor}
          aria-label="Cell color"
          title="Cell color"
        />

        <ToggleGroup type="single" value="" variant="outline" className="bg-background">
          <ToggleGroupItem
            value="insert-row-above"
            onClick={() => insertTableRowAtSelection(false)}
            aria-label={`Insert ${tableSelectionCounts.rows === 1 ? 'row' : `${tableSelectionCounts.rows} rows`} above`}
            title={`Insert ${tableSelectionCounts.rows === 1 ? 'row' : `${tableSelectionCounts.rows} rows`} above`}
          >
            <AddRowAboveIcon />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="insert-row-below"
            onClick={() => insertTableRowAtSelection(true)}
            aria-label={`Insert ${tableSelectionCounts.rows === 1 ? 'row' : `${tableSelectionCounts.rows} rows`} below`}
            title={`Insert ${tableSelectionCounts.rows === 1 ? 'row' : `${tableSelectionCounts.rows} rows`} below`}
          >
            <AddRowBelowIcon />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="delete-row"
            onClick={deleteTableRowAtSelection}
            aria-label={`Delete ${tableSelectionCounts.rows === 1 ? 'row' : `${tableSelectionCounts.rows} rows`}`}
            title={`Delete ${tableSelectionCounts.rows === 1 ? 'row' : `${tableSelectionCounts.rows} rows`}`}
          >
            <RemoveRowIcon />
          </ToggleGroupItem>
        </ToggleGroup>

        <ToggleGroup type="single" value="" variant="outline" className="bg-background">
          <ToggleGroupItem
            value="insert-column-left"
            onClick={() => insertTableColumnAtSelection(false)}
            aria-label={`Insert ${tableSelectionCounts.columns === 1 ? 'column' : `${tableSelectionCounts.columns} columns`} left`}
            title={`Insert ${tableSelectionCounts.columns === 1 ? 'column' : `${tableSelectionCounts.columns} columns`} left`}
          >
            <AddColumnLeftIcon />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="insert-column-right"
            onClick={() => insertTableColumnAtSelection(true)}
            aria-label={`Insert ${tableSelectionCounts.columns === 1 ? 'column' : `${tableSelectionCounts.columns} columns`} right`}
            title={`Insert ${tableSelectionCounts.columns === 1 ? 'column' : `${tableSelectionCounts.columns} columns`} right`}
          >
            <AddColumnRightIcon />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="delete-column"
            onClick={deleteTableColumnAtSelection}
            aria-label={`Delete ${tableSelectionCounts.columns === 1 ? 'column' : `${tableSelectionCounts.columns} columns`}`}
            title={`Delete ${tableSelectionCounts.columns === 1 ? 'column' : `${tableSelectionCounts.columns} columns`}`}
          >
            <RemoveColumnIcon />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </>
  );
}

export default function TableToolbar({
  node,
  anchorElem = document.querySelector('.editor-container') as HTMLElement,
}: {
  node: TableNode;
  anchorElem?: HTMLElement;
}) {
  return createPortal(<TableTools node={node} />, anchorElem);
}
