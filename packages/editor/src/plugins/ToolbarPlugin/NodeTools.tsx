/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';
import { $isCodeNode } from '@lexical/code';
import { BlockFormatSelect } from '@repo/editor/components/Menus/BlockFormatSelect';
import { $isMathNode } from '@repo/editor/nodes/MathNode';
import { $isImageNode } from '@repo/editor/nodes/ImageNode';
import { $isTableNode } from '@repo/editor/nodes/TableNode';
import { $isStickyNode } from '@repo/editor/nodes/StickyNode';
import { $isAlertNode } from '@repo/editor/nodes/AlertNode';
import { $isDetailsContainerNode } from '@repo/editor/nodes/DetailsNode';
import { $isHorizontalRuleNode } from '@repo/editor/nodes/HorizontalRuleNode';
import { $isAttachmentNode } from '@repo/editor/nodes/AttachmentNode';
import CodeToolbar from '@repo/editor/components/Tools/CodeTools';
import FontSelect from '@repo/editor/components/Menus/FontSelect';
import ImageToolbar from '@repo/editor/components/Tools/ImageTools';
import MathToolbar from '@repo/editor/components/Tools/MathTools';
import NoteToolbar from '@repo/editor/components/Tools/NoteTools';
import TableToolbar from '@repo/editor/components/Tools/TableTools';
import TextFormatToggles from '@repo/editor/components/Tools/TextFormatToggles';
import AlertTools from '@repo/editor/components/Tools/AlertTools';
import DetailsTools from '@repo/editor/components/Tools/DetailsTools';
import HrTools from '@repo/editor/components/Tools/HrTools';
import AttachmentToolbar from '@repo/editor/components/Tools/AttachmentTools';
import { cn } from '@repo/ui/lib/utils';
import { useSelector } from '@repo/editor/store';

export default function NodeTools() {
  const blockType = useSelector((state) => state.blockType);
  const selectedNode = useSelector((state) => state.selectedNode);
  const isTable = useSelector((state) => state.isTable);
  const isNote = useSelector((state) => state.isNote);
  const isAlert = useSelector((state) => state.isAlert);
  const isDetails = useSelector((state) => state.isDetails);
  const isImage = useSelector((state) => state.isImage);
  const isMath = useSelector((state) => state.isMath);
  const isHorizontalRule = useSelector((state) => state.isHorizontalRule);
  const isAttachment = useSelector((state) => state.isAttachment);
  // Compute all node type checks internally
  const isMathNode = $isMathNode(selectedNode);
  const isImageNode = $isImageNode(selectedNode);
  const isCodeNode = $isCodeNode(selectedNode);
  const isStickyNode = $isStickyNode(selectedNode);
  const isTableNode = $isTableNode(selectedNode);
  const isAlertNode = $isAlertNode(selectedNode);
  const isDetailsContainerNode = $isDetailsContainerNode(selectedNode);
  const isHorizontalRuleNode = $isHorizontalRuleNode(selectedNode);
  const isAttachmentNode = $isAttachmentNode(selectedNode);

  // Determine what to show based on node types
  const showMathTools = isMath && isMathNode;
  const showImageTools = isImage && isImageNode;
  const showCodeTools = blockType === 'code' && isCodeNode;
  const showTableTools = isTable && isTableNode;
  const showAlertTools = isAlert && isAlertNode;
  const showDetailsTools = isDetails && isDetailsContainerNode;
  const showHrTools = isHorizontalRule && isHorizontalRuleNode;
  const showNoteTools = isNote && isStickyNode;
  const showAttachmentTools = isAttachment && isAttachmentNode;
  const showTextTools = !showMathTools || isStickyNode;
  const showTextFormatTools = showTextTools && !showCodeTools;

  return (
    <>
      <BlockFormatSelect />
      <FontSelect />
      {showCodeTools && <CodeToolbar node={selectedNode} />}
      {showMathTools && <MathToolbar node={selectedNode} />}
      {showImageTools && <ImageToolbar node={selectedNode} />}
      {showNoteTools && <NoteToolbar node={selectedNode} />}
      {showTableTools && <TableToolbar node={selectedNode} />}
      {showAlertTools && <AlertTools node={selectedNode} />}
      {showDetailsTools && <DetailsTools node={selectedNode} />}
      {showHrTools && <HrTools node={selectedNode} />}
      {showAttachmentTools && <AttachmentToolbar node={selectedNode} />}
      {showTextFormatTools && (
        <TextFormatToggles
          className={cn(
            'flex sm:hidden md:hidden xl:flex bottom-[calc(var(--keyboard-inset-height)+4px)] z-50',
            'fixed inset-x-0 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:static justify-center sm:justify-start',
          )}
        />
      )}
    </>
  );
}
