/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export * from '@lexical/table';
export {
  TableNode as LexicalTableNode,
  TableCellNode as LexicalTableCellNode,
  TableRowNode,
} from '@lexical/table';
export { $createTableCellNode, $isTableCellNode, TableCellNode } from './TableCellNode';
export type { SerializedTableNode } from './TableNode';
export { $createTableNode, $isTableNode, TableNode } from './TableNode';
