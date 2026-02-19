/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';
import { ImageNode } from '@repo/editor/nodes/ImageNode';
import { $isSketchNode, SketchNode } from '@repo/editor/nodes/SketchNode';
import { $isDiagramNode, DiagramNode } from '@repo/editor/nodes/DiagramNode';
import { $patchStyle, getStyleObjectFromCSS } from '@repo/editor/utils/nodeUtils';
import { useEffect, useState, useCallback, useLayoutEffect, useRef } from 'react';
import { FormatImageLeftIcon, FormatImageRightIcon } from '@repo/editor/components/icons';
import {
  EditIcon,
  SubtitlesIcon,
  AlignJustifyIcon,
  Trash2Icon,
  SunMoonIcon,
  BrushIcon,
} from '@repo/ui/components/icons';
import { $isIFrameNode, IFrameNode } from '@repo/editor/nodes/IFrameNode';
import { Toggle } from '@repo/ui/components/toggle';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useActions } from '@repo/editor/store';
import { createPortal } from 'react-dom';
import { COMMAND_PRIORITY_LOW } from 'lexical';
import { mergeRegister } from '@lexical/utils';
import {
  FLOAT_IMAGE_COMMAND,
  TOGGLE_IMAGE_FILTER_COMMAND,
  TOGGLE_IMAGE_CAPTION_COMMAND,
} from '@repo/editor/commands';
import { ToggleGroup, ToggleGroupItem } from '@repo/ui/components/toggle-group';
import { $isScoreNode, ScoreNode } from '@repo/editor/nodes/ScoreNode';

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

function ImageTools({
  node,
}: {
  node: ImageNode | SketchNode | DiagramNode | IFrameNode | ScoreNode;
}) {
  const [editor] = useLexicalComposerContext();
  const { updateEditorStoreState } = useActions();
  const imageToolbarRef = useRef<HTMLDivElement | null>(null);

  const openImageDialog = () => updateEditorStoreState('openDialog', 'image');
  const openSketchDialog = () => updateEditorStoreState('openDialog', 'sketch');
  const openDiagramDialog = () => updateEditorStoreState('openDialog', 'diagram');
  const openIFrameDialog = () => updateEditorStoreState('openDialog', 'iframe');
  const openScoreDialog = () => updateEditorStoreState('openDialog', 'score');

  const isSketchNode = $isSketchNode(node);
  const isDiagramNode = $isDiagramNode(node);
  const isIFrameNode = $isIFrameNode(node);
  const isScoreNode = $isScoreNode(node);

  const openDialog = isSketchNode
    ? openSketchDialog
    : isDiagramNode
      ? openDiagramDialog
      : isIFrameNode
        ? openIFrameDialog
        : isScoreNode
          ? openScoreDialog
          : openImageDialog;

  function getNodeStyle(): Record<string, string | null> | null {
    return editor.getEditorState().read(() => {
      if ('getStyle' in node === false) return null;
      const css = node.getStyle();
      if (!css) return null;
      const style = getStyleObjectFromCSS(css);
      return style;
    });
  }

  const [style, setStyle] = useState(getNodeStyle());

  const $updateToolbar = useCallback(() => {
    if (node.isAttached()) {
      const style = getNodeStyle();
      setStyle(style);
      const float = style?.float || 'none';
      const filter = style?.filter || null;
      updateEditorStoreState('imageStyle', {
        float: float as 'none' | 'left' | 'right',
        filter: filter,
      });
    }
  }, [editor, node, updateEditorStoreState, getNodeStyle]);

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      editor.read(() => {
        $updateToolbar();
      });
    });
  }, [editor, $updateToolbar]);

  useEffect(() => {
    editor.getEditorState().read(() => {
      $updateToolbar();
    });
  }, [editor, $updateToolbar]);

  const updateStyle = useCallback(
    (newStyle: Record<string, string | null>) => {
      editor.update(() => {
        $patchStyle(node, newStyle);
      });
    },
    [editor, node],
  );

  const toggleShowCaption = useCallback(() => {
    editor.update(() => {
      node.setShowCaption(!node.getShowCaption());
    });
  }, [editor, node]);

  const deleteNode = useCallback(() => {
    editor.update(() => {
      node.selectPrevious();
      node.remove();
    });
  }, [editor, node]);

  const updateFloat = useCallback(
    (newFloat: 'left' | 'right' | 'none') => {
      editor.update(() => {
        node.select();
        $patchStyle(node, { float: newFloat });
      });
    },
    [editor, node],
  );

  const toggleFilter = useCallback(() => {
    const isFiltered = style?.filter === 'auto';
    updateStyle({ filter: isFiltered ? null : 'auto' });
  }, [style?.filter, updateStyle]);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        FLOAT_IMAGE_COMMAND,
        (newFloat) => {
          updateFloat(newFloat);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        TOGGLE_IMAGE_FILTER_COMMAND,
        () => {
          toggleFilter();
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        TOGGLE_IMAGE_CAPTION_COMMAND,
        () => {
          toggleShowCaption();
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, updateFloat, toggleFilter, toggleShowCaption]);

  useLayoutEffect(() => {
    const imageToolbarElem = imageToolbarRef.current;
    if (imageToolbarElem === null) return;
    const imageElement = editor.getElementByKey(node.getKey());
    if (imageElement === null) return;

    (imageElement.style as any).anchorName = `--image-anchor-${node.getKey()}`;
    imageToolbarElem.setAttribute(
      'style',
      `position-anchor: --image-anchor-${node.getKey()}; top: calc(anchor(top) + var(--spacing) * 2); justify-self: anchor-center;`,
    );

    anchorPolyfill([imageElement, imageToolbarElem]);
  }, [node, editor]);

  const isImageNode = node.__type === 'image';
  const isFiltered = style?.filter === 'auto';
  const floatValue = style?.float || 'none';

  return (
    <div
      ref={imageToolbarRef}
      className="image-toolbar flex absolute z-30 will-change-transform print:hidden gap-1"
    >
      <Toggle
        variant="outline"
        pressed={false}
        value="edit"
        onClick={openDialog}
        aria-label={`Edit ${isSketchNode ? 'sketch' : isDiagramNode ? 'diagram' : isIFrameNode ? 'iframe' : isScoreNode ? 'score' : 'image'}`}
        title={`Edit ${isSketchNode ? 'sketch' : isDiagramNode ? 'diagram' : isIFrameNode ? 'iframe' : isScoreNode ? 'score' : 'image'}`}
      >
        <EditIcon />
      </Toggle>
      {isImageNode && (
        <Toggle
          variant="outline"
          pressed={false}
          value="sketch"
          onClick={openSketchDialog}
          aria-label="Draw on image"
          title="Draw on image"
        >
          <BrushIcon />
        </Toggle>
      )}
      <Toggle
        variant="outline"
        value="caption"
        pressed={node.getShowCaption()}
        onClick={toggleShowCaption}
        aria-label="Toggle caption"
        title="Toggle caption"
      >
        <SubtitlesIcon />
      </Toggle>
      <Toggle
        variant="outline"
        value="filter-toggle"
        pressed={isFiltered}
        onClick={toggleFilter}
        aria-label="Toggle dark mode filter"
        title="Toggle dark mode filter"
      >
        <SunMoonIcon />
      </Toggle>
      <ToggleGroup type="single" variant="outline" value={floatValue} onValueChange={updateFloat}>
        <ToggleGroupItem value="left" aria-label="Float left" title="Float left">
          <FormatImageLeftIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="none" aria-label="Float none" title="Float none">
          <AlignJustifyIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="right" aria-label="Float right" title="Float right">
          <FormatImageRightIcon />
        </ToggleGroupItem>
      </ToggleGroup>
      <Toggle
        variant="outline"
        pressed={false}
        value="delete"
        onClick={deleteNode}
        aria-label="Delete image"
        title="Delete image"
      >
        <Trash2Icon />
      </Toggle>
    </div>
  );
}

export default function ImageToolbar({
  node,
  anchorElem = document.querySelector('.editor-container') as HTMLElement,
}: {
  node: ImageNode | SketchNode | DiagramNode | IFrameNode | ScoreNode;
  anchorElem?: HTMLElement;
}) {
  return createPortal(<ImageTools node={node} />, anchorElem);
}
