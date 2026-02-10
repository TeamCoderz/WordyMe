'use client';
import { $getSelection, $isNodeSelection, $isRangeSelection, $setSelection } from 'lexical';
import { $isCodeNode } from '@lexical/code';
import { $isListNode, ListNode } from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isHeadingNode } from '@lexical/rich-text';
import { $getSelectionStyleValueForProperty, $isParentElementRTL } from '@lexical/selection';
import { $findMatchingParent, $getNearestNodeOfType, mergeRegister } from '@lexical/utils';
import {
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
} from 'lexical';
import { useCallback, useEffect } from 'react';
import InsertToolMenu from '@repo/editor/components/Menus/InsertToolMenu';
import AlignTextMenu from '@repo/editor/components/Menus/AlignTextMenu';
import { $isImageNode } from '@repo/editor/nodes/ImageNode';
import ImageDialog from '@repo/editor/components/Dialogs/ImageDialog';
import AttachmentDialog from '@repo/editor/components/Dialogs/AttachmentDialog';
import SketchDialog from '@repo/editor/components/Dialogs/SketchDialog';
import DiagramDialog from '@repo/editor/components/Dialogs/DiagramDialog';
import ScoreDialog from '@repo/editor/components/Dialogs/ScoreDialog';
import TableDialog from '@repo/editor/components/Dialogs/TableDialog';
import IFrameDialog from '@repo/editor/components/Dialogs/IFrameDialog';
import LinkDialog from '@repo/editor/components/Dialogs/LinkDialog';
import LayoutDialog from '@repo/editor/components/Dialogs/LayoutDialog';
import { $isStickyNode } from '@repo/editor/nodes/StickyNode';
import { $isIFrameNode } from '@repo/editor/nodes/IFrameNode';
import { IS_APPLE } from '@lexical/utils';
import { $isLinkNode } from '@lexical/link';
import { getSelectedNode } from '@repo/editor/utils/getSelectedNode';
import { ToggleGroup, ToggleGroupItem } from '@repo/ui/components/toggle-group';
import { RedoIcon, UndoIcon } from '@repo/ui/components/icons';
import NodeTools from './NodeTools';
import { $isTableNode, $isTableSelection } from '@repo/editor/nodes/TableNode';
import { $isAlertNode } from '@repo/editor/nodes/AlertNode';
import { $isDetailsContainerNode } from '@repo/editor/nodes/DetailsNode';
import { $isMathNode } from '@repo/editor/nodes/MathNode';
import { setEditorPlaceholder } from '@repo/editor/utils/setEditorPlaceholder';
import { $isHorizontalRuleNode } from '@repo/editor/nodes/HorizontalRuleNode';
import { $isAttachmentNode } from '@repo/editor/nodes/AttachmentNode';
import { $isScoreNode } from '@repo/editor/nodes/ScoreNode';
import { useSelector, useActions, blockTypeToBlockName } from '@repo/editor/store';
import { $isPageHeaderNode, $isPageFooterNode } from '@repo/editor/nodes/PageNode';

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const canUndo = useSelector((state) => state.canUndo);
  const canRedo = useSelector((state) => state.canRedo);
  const selectedNode = useSelector((state) => state.selectedNode);
  const selectedLinkNode = useSelector((state) => state.selectedLinkNode);
  const openDialog = useSelector((state) => state.openDialog);
  const { updateEditorStoreState } = useActions();
  const $updateToolbar = useCallback(() => {
    updateEditorStoreState('blockType', 'paragraph');
    updateEditorStoreState('isRTL', false);
    updateEditorStoreState('isLink', false);
    updateEditorStoreState('selectedNode', null);
    updateEditorStoreState('isTable', false);
    updateEditorStoreState('isNote', false);
    updateEditorStoreState('isAlert', false);
    updateEditorStoreState('isDetails', false);
    updateEditorStoreState('isImage', false);
    updateEditorStoreState('isMath', false);
    updateEditorStoreState('isAttachment', false);

    const selection = $getSelection();
    if ($isNodeSelection(selection)) {
      const node = selection.getNodes()[0];
      updateEditorStoreState('selectedNode', node);
      updateEditorStoreState('blockType', 'paragraph');
      updateEditorStoreState('isMath', $isMathNode(node));
      const isHorizontalRule = $isHorizontalRuleNode(node);
      updateEditorStoreState('isHorizontalRule', isHorizontalRule);
      if (isHorizontalRule) {
        updateEditorStoreState('horizontalRuleVariant', node.getVariant());
      }
      const isAttachment = $isAttachmentNode(node);
      updateEditorStoreState('isAttachment', isAttachment);
      if (isAttachment) {
        return;
      }
      return;
    }
    if ($isTableSelection(selection)) {
      const tableNode = selection.getNodes()[0];
      if (tableNode) updateEditorStoreState('selectedNode', tableNode);
      updateEditorStoreState('isTable', true);
      return;
    }

    if ($isRangeSelection(selection)) {
      const node = getSelectedNode(selection);
      // Update text format
      updateEditorStoreState('isBold', selection.hasFormat('bold'));
      updateEditorStoreState('isItalic', selection.hasFormat('italic'));
      updateEditorStoreState('isUnderline', selection.hasFormat('underline'));
      updateEditorStoreState('isStrikethrough', selection.hasFormat('strikethrough'));
      updateEditorStoreState('isSubscript', selection.hasFormat('subscript'));
      updateEditorStoreState('isSuperscript', selection.hasFormat('superscript'));
      updateEditorStoreState('isHighlight', selection.hasFormat('highlight'));
      updateEditorStoreState('isCode', selection.hasFormat('code'));

      updateEditorStoreState('isLowercase', selection.hasFormat('lowercase'));
      updateEditorStoreState('isUppercase', selection.hasFormat('uppercase'));
      updateEditorStoreState('isCapitalize', selection.hasFormat('capitalize'));

      updateEditorStoreState('fontColor', $getSelectionStyleValueForProperty(selection, 'color'));
      updateEditorStoreState(
        'bgColor',
        $getSelectionStyleValueForProperty(selection, 'background-color'),
      );

      updateEditorStoreState('isSelectionNullOrCollapsed', selection.isCollapsed());
      const linkNode = $findMatchingParent(node, $isLinkNode);
      updateEditorStoreState('selectedLinkNode', linkNode);
      updateEditorStoreState('isLink', !!linkNode);

      const pageHeaderNode = $findMatchingParent(node, $isPageHeaderNode);
      updateEditorStoreState('isPageHeader', !!pageHeaderNode);
      const pageFooterNode = $findMatchingParent(node, $isPageFooterNode);
      updateEditorStoreState('isPageFooter', !!pageFooterNode);

      updateEditorStoreState('isRTL', $isParentElementRTL(selection));

      const anchorNode = selection.anchor.getNode();
      const element =
        anchorNode.getKey() === 'root' ? anchorNode : anchorNode.getTopLevelElementOrThrow();

      if ($isListNode(element)) {
        const parentList = $getNearestNodeOfType<ListNode>(anchorNode, ListNode);
        const type = parentList ? parentList.getListType() : element.getListType();
        updateEditorStoreState('blockType', type);
      } else {
        const type = $isHeadingNode(element) ? element.getTag() : element.getType();
        if (type in blockTypeToBlockName) {
          updateEditorStoreState('blockType', type as keyof typeof blockTypeToBlockName);
        }
        if ($isCodeNode(element)) {
          updateEditorStoreState('selectedNode', element);
          return;
        }
      }

      const imageNode = $findMatchingParent(node, $isImageNode);
      if (imageNode) {
        updateEditorStoreState('selectedNode', imageNode);
        updateEditorStoreState('isImage', true);
        return;
      }

      const tableNode = $findMatchingParent(node, $isTableNode);
      if (tableNode) {
        updateEditorStoreState('selectedNode', tableNode);
        updateEditorStoreState('isTable', true);
        return;
      }

      const alertNode = $findMatchingParent(node, $isAlertNode);
      if (alertNode) {
        updateEditorStoreState('selectedNode', alertNode);
        updateEditorStoreState('isAlert', true);
        return;
      }

      const detailsNode = $findMatchingParent(node, $isDetailsContainerNode);
      if (detailsNode) {
        updateEditorStoreState('selectedNode', detailsNode);
        updateEditorStoreState('isDetails', true);
        return;
      }

      const stickyNode = $findMatchingParent(node, $isStickyNode);
      if (stickyNode) {
        updateEditorStoreState('selectedNode', stickyNode);
        updateEditorStoreState('isNote', true);
        return;
      }

      const attachmentNode = $findMatchingParent(node, $isAttachmentNode);
      if (attachmentNode) {
        updateEditorStoreState('selectedNode', attachmentNode);
        updateEditorStoreState('isAttachment', true);
        return;
      }
    }

    if (selection === null) {
      updateEditorStoreState('blockType', 'paragraph');
      updateEditorStoreState('selectedNode', null);
      updateEditorStoreState('isSelectionNullOrCollapsed', true);
    }
  }, [editor, updateEditorStoreState]);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          $updateToolbar();
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    );
  }, [editor, $updateToolbar]);

  useEffect(() => {
    editor.getEditorState().read(
      () => {
        $updateToolbar();
      },
      { editor },
    );
  }, [editor, $updateToolbar]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(
          () => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              setEditorPlaceholder({ selection, editor });
            }
            $updateToolbar();
          },
          { editor },
        );
      }),
      editor.registerCommand<boolean>(
        CAN_UNDO_COMMAND,
        (payload) => {
          updateEditorStoreState('canUndo', payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand<boolean>(
        CAN_REDO_COMMAND,
        (payload) => {
          updateEditorStoreState('canRedo', payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    );
  }, [editor, $updateToolbar]);

  useEffect(() => {
    if (openDialog !== null) return;
    const selection = editor.getEditorState().read($getSelection);
    if (!selection) return;
    setTimeout(() => {
      editor.update(() => {
        $setSelection(selection.clone());
      });
      editor.getRootElement()?.focus({ preventScroll: true });
    }, 0);
  }, [openDialog]);

  return (
    <>
      <div className="sticky z-50 w-full overflow-hidden print:hidden border-b top-[calc(--spacing(14)+1px)] h-14 flex items-center">
        <div className="editor-toolbar w-full h-full px-4 py-2 bg-background print:hidden flex justify-between gap-2 sm:gap-6">
          <div className="flex flex-1 justify-between items-center gap-2 sm:gap-6 max-w-250 mx-auto">
            <div className="flex self-start gap-2">
              <ToggleGroup type="single" variant="outline" value="" className="bg-background">
                <ToggleGroupItem
                  value="undo"
                  title={IS_APPLE ? 'Undo (⌘Z)' : 'Undo (Ctrl+Z)'}
                  aria-label="Undo"
                  disabled={!canUndo}
                  onClick={() => {
                    editor.dispatchCommand(UNDO_COMMAND, undefined);
                  }}
                >
                  <UndoIcon className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="redo"
                  title={IS_APPLE ? 'Redo (⌘Y)' : 'Redo (Ctrl+Y)'}
                  aria-label="Redo"
                  disabled={!canRedo}
                  onClick={() => {
                    editor.dispatchCommand(REDO_COMMAND, undefined);
                  }}
                >
                  <RedoIcon className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="flex gap-2 justify-center">
              <NodeTools />
            </div>
            <div className="flex self-start gap-2">
              <InsertToolMenu />
              <AlignTextMenu />
            </div>
          </div>
        </div>
      </div>

      {openDialog === 'image' && (
        <ImageDialog node={$isImageNode(selectedNode) ? selectedNode : null} />
      )}
      {openDialog === 'attachment' && (
        <AttachmentDialog node={$isAttachmentNode(selectedNode) ? selectedNode : null} />
      )}
      {openDialog === 'sketch' && (
        <SketchDialog node={$isImageNode(selectedNode) ? selectedNode : null} />
      )}
      {openDialog === 'diagram' && (
        <DiagramDialog node={$isImageNode(selectedNode) ? selectedNode : null} />
      )}
      {openDialog === 'score' && (
        <ScoreDialog node={$isScoreNode(selectedNode) ? selectedNode : null} />
      )}
      {openDialog === 'table' && <TableDialog />}
      {openDialog === 'iframe' && (
        <IFrameDialog node={$isIFrameNode(selectedNode) ? selectedNode : null} />
      )}
      {openDialog === 'link' && <LinkDialog node={selectedLinkNode} />}
      {openDialog === 'layout' && <LayoutDialog />}
    </>
  );
}

export default function useToolbarPlugin() {
  return <ToolbarPlugin />;
}
