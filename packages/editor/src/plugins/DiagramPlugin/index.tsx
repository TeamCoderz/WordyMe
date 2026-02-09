'use client';
import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  $isRootNode,
  LexicalCommand,
} from 'lexical';
import { $findMatchingParent, $wrapNodeInElement, mergeRegister } from '@lexical/utils';
import { COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';

import { $createDiagramNode, DiagramNode, DiagramPayload } from '@repo/editor/nodes/DiagramNode';
import { $isImageNode } from '@repo/editor/nodes/ImageNode';

export type InsertDiagramPayload = Readonly<DiagramPayload>;

export const INSERT_DIAGRAM_COMMAND: LexicalCommand<InsertDiagramPayload> = createCommand();

export default function DiagramPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([DiagramNode])) {
      throw new Error('DiagramPlugin: DiagramNode not registered on editor');
    }

    return mergeRegister(
      editor.registerCommand<InsertDiagramPayload>(
        INSERT_DIAGRAM_COMMAND,
        (payload) => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const imageNode = $findMatchingParent(selection.anchor.getNode(), $isImageNode);
            imageNode?.remove();
          }
          const diagramNode = $createDiagramNode(payload);
          diagramNode.append($createTextNode(payload.altText || 'Diagram'));
          $insertNodes([diagramNode]);
          if ($isRootNode(diagramNode.getParentOrThrow())) {
            $wrapNodeInElement(diagramNode, $createParagraphNode).selectEnd();
          }
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    );
  }, [editor]);

  return null;
}
