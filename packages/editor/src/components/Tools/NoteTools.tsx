/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { $getNodeStyleValueForProperty, $patchStyle } from '@repo/editor/utils/nodeUtils';
import { StickyNode } from '@repo/editor/nodes/StickyNode';
import ColorPicker from '@repo/editor/components/color-picker';
import { ToggleGroup, ToggleGroupItem } from '@repo/ui/components/toggle-group';
import { FormatImageLeftIcon, FormatImageRightIcon } from '@repo/editor/components/icons';
import { Trash2Icon } from '@repo/ui/components/icons';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useSelector, useActions } from '@repo/editor/store';
import { createPortal } from 'react-dom';
import { COMMAND_PRIORITY_LOW } from 'lexical';
import { mergeRegister } from '@lexical/utils';
import { FLOAT_NOTE_COMMAND, UPDATE_NOTE_COLOR_COMMAND } from '@repo/editor/commands';

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

function NoteTools({ node }: { node: StickyNode }) {
  const [editor] = useLexicalComposerContext();
  const { float, color, backgroundColor } = useSelector((state) => state.noteStyle);
  const { updateEditorStoreState } = useActions();
  const noteToolbarRef = useRef<HTMLDivElement | null>(null);

  const $updateToolbar = useCallback(() => {
    if (node.isAttached()) {
      const float = $getNodeStyleValueForProperty(node, 'float', 'right');
      const color = $getNodeStyleValueForProperty(node, 'color', '#0a0a0a');
      const backgroundColor = $getNodeStyleValueForProperty(node, 'background-color', '#bceac4');
      updateEditorStoreState('noteStyle', {
        float: float as 'left' | 'right',
        color: color,
        backgroundColor: backgroundColor,
      });
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
    editor.getEditorState().read(() => {
      $updateToolbar();
    });
  }, [editor, $updateToolbar]);

  const deleteNode = useCallback(() => {
    editor.update(() => {
      node.selectPrevious();
      node.remove();
    });
  }, [editor, node]);

  const updateFloat = useCallback(
    (newFloat: 'left' | 'right') => {
      if (!newFloat) return;
      editor.update(() => {
        node.select();
        $patchStyle(node, { float: newFloat });
      });
    },
    [editor, node],
  );

  const updateNoteColor = useCallback(
    (key: string, value: string | null) => {
      editor.update(() => {
        node.select();
        $patchStyle(node, { [key]: value });
      });
    },
    [editor, node],
  );

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        FLOAT_NOTE_COMMAND,
        (newFloat) => {
          updateFloat(newFloat);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        UPDATE_NOTE_COLOR_COMMAND,
        (payload) => {
          updateNoteColor(payload.key, payload.value);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, updateFloat, updateNoteColor]);

  useLayoutEffect(() => {
    const noteToolbarElem = noteToolbarRef.current;
    if (noteToolbarElem === null) return;
    const noteElement = editor.getElementByKey(node.getKey());
    if (noteElement === null) return;

    (noteElement.style as any).anchorName = `--note-anchor-${node.getKey()}`;
    noteToolbarElem.setAttribute(
      'style',
      `position-anchor: --note-anchor-${node.getKey()}; bottom: calc(anchor(top) + 0.25rem); justify-self: anchor-center;`,
    );

    anchorPolyfill([noteElement, noteToolbarElem]);
  }, [node, editor]);

  return (
    <div
      ref={noteToolbarRef}
      className="note-toolbar flex px-4 absolute z-30 will-change-transform print:hidden gap-1"
    >
      <ToggleGroup
        type="single"
        variant="outline"
        className="bg-background"
        value={float}
        onValueChange={updateFloat}
      >
        <ToggleGroupItem value="left" aria-label="Float left" title="Float left">
          <FormatImageLeftIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="right" aria-label="Float right" title="Float right">
          <FormatImageRightIcon />
        </ToggleGroupItem>
      </ToggleGroup>

      <ColorPicker
        defaultTextColor="#0a0a0a"
        defaultBackgroundColor="#bceac4"
        defaultBorderColor="#bceac4"
        onColorChange={updateNoteColor}
        textColor={color}
        backgroundColor={backgroundColor}
        aria-label="Note color"
        title="Note color"
      />

      <ToggleGroup type="single" value="" variant="outline" className="bg-background">
        <ToggleGroupItem
          value="delete-note"
          aria-label="Delete Note"
          title="Delete Note"
          onClick={deleteNode}
        >
          <Trash2Icon className="size-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

export default function NoteToolbar({
  node,
  anchorElem = document.querySelector('.editor-container') as HTMLElement,
}: {
  node: StickyNode;
  anchorElem?: HTMLElement;
}) {
  return createPortal(<NoteTools node={node} />, anchorElem);
}
