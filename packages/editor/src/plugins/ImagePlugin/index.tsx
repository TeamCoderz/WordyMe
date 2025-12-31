'use client';
import {
  $addUpdateTag,
  $createParagraphNode,
  $createTextNode,
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $insertNodes,
  $isRangeSelection,
  $isRootOrShadowRoot,
  COMMAND_PRIORITY_CRITICAL,
  DELETE_CHARACTER_COMMAND,
  ElementNode,
  HISTORIC_TAG,
  HISTORY_MERGE_TAG,
  HISTORY_PUSH_TAG,
  isHTMLElement,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  LexicalCommand,
  MutationListener,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $findMatchingParent, $wrapNodeInElement, mergeRegister } from '@lexical/utils';
import {
  $createRangeSelection,
  $getSelection,
  $setSelection,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  createCommand,
  DRAGOVER_COMMAND,
  DRAGSTART_COMMAND,
  DROP_COMMAND,
} from 'lexical';
import { useEffect } from 'react';

import {
  $createImageNode,
  $isImageNode,
  ImageNode,
  ImagePayload,
} from '@repo/editor/nodes/ImageNode';
import { getSelectedNode } from '@repo/editor/utils/getSelectedNode';
import { SketchNode } from '@repo/editor/nodes/SketchNode';
import { ScoreNode } from '@repo/editor/nodes/ScoreNode';
import { useActions } from '@repo/editor/store';
import { ANNOUNCE_COMMAND } from '@repo/editor/commands';
import './index.css';

export * from './ImageResizer';

export type InsertImagePayload = Readonly<ImagePayload>;

export const INSERT_IMAGE_COMMAND: LexicalCommand<InsertImagePayload> = createCommand();

const processingNodeKeys = new Set<string>();

export function ImagesPlugin() {
  const [editor] = useLexicalComposerContext();
  const { uploadImage, getImageSignedUrl } = useActions();

  useEffect(() => {
    if (!editor.hasNodes([ImageNode])) {
      throw new Error('ImagesPlugin: ImageNode not registered on editor');
    }

    const $onSelectionChange = () => {
      const selection = $getSelection();
      const nativeSelection = window.getSelection();
      if (!$isRangeSelection(selection)) return false;
      const imageNode = $findMatchingParent(selection.anchor.getNode(), $isImageNode);
      if (!imageNode) return false;
      if (!nativeSelection) return false;
      const anchorNode = nativeSelection.anchorNode;
      if (!anchorNode) return false;
      const figure = editor.getElementByKey(imageNode.getKey());
      if (!figure) return false;
      const isTextAnchor =
        anchorNode.nodeType === Node.TEXT_NODE || anchorNode.nodeName === 'FIGCAPTION';
      if (!isTextAnchor) {
        // handle clicking on empty figcaption
        const activeElement = document.activeElement;
        if (figure.contains(activeElement)) {
          if (isHTMLElement(activeElement) && activeElement.nodeName === 'FIGCAPTION') {
            const figcaption = activeElement;
            const range = document.createRange();
            range.selectNodeContents(figcaption);
            nativeSelection.removeAllRanges();
            nativeSelection.addRange(range);
            return true;
          }
          return false;
        }

        // handle clicking on image parent element
        const parent = imageNode.getParentOrThrow<ElementNode>();
        const parentKey = parent.getKey();
        const parentDom = editor.getElementByKey(parentKey);
        if (anchorNode !== parentDom) return false;
        const rangeSelection = $createRangeSelection();
        rangeSelection.anchor.set(parentKey, nativeSelection.anchorOffset, 'element');
        rangeSelection.focus.set(parentKey, nativeSelection.focusOffset, 'element');
        $setSelection(rangeSelection);
        return true;
      }

      return false;
    };

    const $onEscapeLeftRight = (event: KeyboardEvent) => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return false;
      const imageNode = $findMatchingParent(selection.anchor.getNode(), $isImageNode);
      if (!imageNode) return false;
      const nativeSelection = window.getSelection();
      if (!nativeSelection) return false;
      const anchorNode = nativeSelection.anchorNode;
      if (!anchorNode) return false;
      const isTextAnchor =
        anchorNode.nodeType === Node.TEXT_NODE || anchorNode.nodeName === 'FIGCAPTION';
      const isCaptionShown = imageNode.getShowCaption();
      if (isTextAnchor && !isCaptionShown) {
        const isLeftArrow = event.key === 'ArrowLeft';
        const isRightArrow = event.key === 'ArrowRight';
        if (isLeftArrow) {
          const prevSibling = imageNode.getPreviousSibling();
          if (prevSibling) {
            prevSibling.selectEnd();
          } else {
            imageNode.selectPrevious();
          }
        } else if (isRightArrow) {
          const nextSibling = imageNode.getNextSibling();
          if (nextSibling) {
            nextSibling.selectStart();
          } else {
            imageNode.selectNext();
          }
        }
        return true;
      }
      return isTextAnchor;
    };

    const $handleDelete = () => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return false;
      const imageNode = $findMatchingParent(selection.anchor.getNode(), $isImageNode);
      if (!imageNode) return false;
      if (imageNode.getChildrenSize() === 0 || !imageNode.getShowCaption()) {
        imageNode.remove();
        return true;
      }
      return false;
    };

    const uploadDataUrl = async (dataUrl: string, filename: string, mimeType: string) => {
      const blob = await fetch(dataUrl).then((response) => response.blob());
      const file = new File([blob], filename, { type: mimeType });
      const { data: uploadData, error: uploadError } = await uploadImage(file);
      if (uploadError) throw uploadError;
      if (!uploadData) throw new Error('Uploading image failed');
      const fileName = uploadData.path.split('/').pop()!;
      const { data: signedUrlData, error: signedUrlError } = await getImageSignedUrl(fileName);
      if (signedUrlError) throw signedUrlError;
      if (!signedUrlData) throw new Error('Getting image signed url failed');
      return {
        src: `/images/${fileName}`,
        signedUrl: signedUrlData.signedUrl,
      };
    };

    const handleImageNodeCreated = async (key: string, node: ImageNode): Promise<void> => {
      const toastId = `image-${node.getKey()}`;
      try {
        const src = node.getSrc();

        if (src.startsWith('/images/')) {
          const signedUrl = node.getSignedUrl();
          if (signedUrl) return;

          const fileName = src.split('/').pop()!;
          const { data, error } = await getImageSignedUrl(fileName);
          if (error) throw error;

          if (data) {
            editor.update(
              () => {
                const node: null | ImageNode = $getNodeByKey(key);
                if (node) node.setSignedUrl(data.signedUrl);
              },
              { tag: HISTORY_MERGE_TAG },
            );
          }
        } else if (src.startsWith('data:image/')) {
          editor.dispatchCommand(ANNOUNCE_COMMAND, {
            id: toastId,
            type: 'loading',
            message: {
              title: 'Uploading image',
              subtitle: 'image is being uploaded in the background',
            },
          });

          const altText = node.getAltText();
          const header = src.split(',')[0];
          const mimeType = header.split(';')[0].split(':')[1];
          const extension = mimeType.split('/')[1].split('+')[0];
          const filename = `${altText}.${extension}`;

          const { src: newSrc, signedUrl } = await uploadDataUrl(src, filename, mimeType);

          editor.update(
            () => {
              const node: null | ImageNode = $getNodeByKey(key);
              if (node) {
                node.setSrc(newSrc);
                node.setSignedUrl(signedUrl);
              }
            },
            { tag: HISTORIC_TAG },
          );
          editor.dispatchCommand(ANNOUNCE_COMMAND, {
            id: toastId,
            type: 'success',
            message: {
              title: 'Image uploaded successfully',
            },
          });
        }
      } catch (error) {
        console.error(error);
        editor.dispatchCommand(ANNOUNCE_COMMAND, {
          id: toastId,
          type: 'error',
          message: {
            title: 'Loading image failed',
            subtitle: 'Please try again later',
          },
        });
      } finally {
        processingNodeKeys.delete(key);
      }
    };

    const imageMutationListener: MutationListener = (mutations) => {
      editor.getEditorState().read(() => {
        for (const [key, mutation] of mutations) {
          if (mutation === 'created') {
            if (processingNodeKeys.has(key)) continue;
            const node: null | ImageNode = $getNodeByKey(key);
            if (!node) continue;
            processingNodeKeys.add(key);
            handleImageNodeCreated(key, node);
          }
        }
      });
    };

    return mergeRegister(
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        $onSelectionChange,
        COMMAND_PRIORITY_CRITICAL,
      ),

      editor.registerCommand<InsertImagePayload>(
        INSERT_IMAGE_COMMAND,
        (payload) => {
          const imageNode = $createImageNode(payload);
          imageNode.append($createTextNode(payload.altText || 'Image'));
          $insertNodes([imageNode]);
          if ($isRootOrShadowRoot(imageNode.getParentOrThrow())) {
            $wrapNodeInElement(imageNode, $createParagraphNode).selectEnd();
          }
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand(KEY_ARROW_LEFT_COMMAND, $onEscapeLeftRight, COMMAND_PRIORITY_LOW),

      editor.registerCommand(KEY_ARROW_RIGHT_COMMAND, $onEscapeLeftRight, COMMAND_PRIORITY_LOW),

      editor.registerCommand(DELETE_CHARACTER_COMMAND, $handleDelete, COMMAND_PRIORITY_LOW),

      editor.registerCommand<DragEvent>(
        DRAGSTART_COMMAND,
        (event) => {
          return onDragStart(event);
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand<DragEvent>(
        DRAGOVER_COMMAND,
        (event) => {
          return onDragover(event);
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand<DragEvent>(
        DROP_COMMAND,
        (event) => {
          return onDrop(event);
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerMutationListener(ImageNode, imageMutationListener),
      editor.registerMutationListener(SketchNode, imageMutationListener),
      editor.registerMutationListener(ScoreNode, imageMutationListener),
    );
  }, [editor]);

  useEffect(() => {
    const handleSelectionChange = () => {
      const domSelection = document.getSelection();
      if (!domSelection) return false;
      const figures = document.querySelectorAll('figure');
      figures.forEach((figure) => {
        const isSelected = domSelection.containsNode(figure);
        figure.classList.toggle('selection-highlight', isSelected);
      });
      return false;
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  return null;
}

function onDragStart(event: DragEvent): boolean {
  const target = event.target;
  if (!isHTMLElement(target)) return false;
  const figure = target.parentElement;
  if (!figure) return false;
  const node = getNodeFromTarget(target);
  if (!node) {
    return false;
  }
  const dataTransfer = event.dataTransfer;
  if (!dataTransfer) {
    return false;
  }
  dataTransfer.setData('text/plain', '_');
  dataTransfer.setDragImage(figure, 0, 0);

  node.selectEnd();
  return true;
}

function onDragover(event: DragEvent): boolean {
  const node = getNodeInSelection();
  if (!node) {
    return false;
  }
  if (!canDropImage(event)) {
    event.preventDefault();
  }
  return true;
}

function onDrop(event: DragEvent): boolean {
  const node = getNodeInSelection();
  if (!node) {
    return false;
  }
  event.preventDefault();
  if (canDropImage(event)) {
    const range = getDragSelection(event);
    node.remove();
    const rangeSelection = $createRangeSelection();
    if (range !== null && range !== undefined) {
      rangeSelection.applyDOMRange(range);
    }
    $setSelection(rangeSelection);
    rangeSelection.insertNodes([node]);
    $addUpdateTag(HISTORY_PUSH_TAG);
  }
  node.selectEnd();
  return true;
}

function getNodeInSelection(): ImageNode | null {
  const selection = $getSelection();
  if ($isRangeSelection(selection)) {
    const node = getSelectedNode(selection);
    return $findMatchingParent(node, $isImageNode);
  }
  return null;
}

function getNodeFromTarget(target: EventTarget | null): ImageNode | null {
  if (!isHTMLElement(target)) return null;
  const node = $getNearestNodeFromDOMNode(target);
  if (!node) return null;
  return $findMatchingParent(node, $isImageNode);
}

declare global {
  interface DragEvent {
    rangeOffset?: number;
    rangeParent?: Node;
  }
}

function canDropImage(event: DragEvent): boolean {
  const target = event.target;
  return !!(
    target &&
    target instanceof HTMLElement &&
    !target.closest('code, figure') &&
    target.parentElement &&
    target.parentElement.closest('div.editor-input')
  );
}

function getDragSelection(event: DragEvent): Range | null | undefined {
  let range;
  const domSelection = window.getSelection();
  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(event.clientX, event.clientY);
  } else if (event.rangeParent && domSelection !== null) {
    domSelection.collapse(event.rangeParent, event.rangeOffset || 0);
    range = domSelection.getRangeAt(0);
  } else {
    throw Error(`Cannot get the selection when dragging`);
  }

  return range;
}
