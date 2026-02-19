/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';
import { DetailsContainerNode, DetailsVariant } from '@repo/editor/nodes/DetailsNode';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@repo/ui/components/toggle-group';
import { DetailsEditableIcon, DetailsVariantIcon } from '@repo/editor/components/icons';
import { Trash2Icon } from '@repo/ui/components/icons';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  UPDATE_DETAILS_VARIANT_COMMAND,
  TOGGLE_DETAILS_EDITABLE_COMMAND,
} from '@repo/editor/commands';
import { mergeRegister } from '@lexical/utils';
import { COMMAND_PRIORITY_LOW } from 'lexical';
import { useSelector, useActions } from '@repo/editor/store';
import { createPortal } from 'react-dom';
import { Toggle } from '@repo/ui/components/toggle';

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

function DetailsTools({ node }: { node: DetailsContainerNode }) {
  const [editor] = useLexicalComposerContext();
  const detailsVariant = useSelector((state) => state.detailsVariant);
  const detailsEditable = useSelector((state) => state.detailsEditable);
  const { updateEditorStoreState } = useActions();

  const detailsToolbarRef = useRef<HTMLDivElement | null>(null);

  const $updateToolbar = useCallback(() => {
    if (node.isAttached()) {
      const variant = node.getVariant();
      const editable = node.getEditable();
      updateEditorStoreState('detailsVariant', variant);
      updateEditorStoreState('detailsEditable', editable);
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

  const updateVariant = useCallback(
    (variant: DetailsVariant) => {
      if (!variant) return;
      editor.update(() => {
        node.setVariant(variant);
      });
    },
    [editor, node],
  );

  const toggleEditable = useCallback(() => {
    editor.update(() => {
      const currentEditable = node.getEditable();
      node.setEditable(!currentEditable);
    });
  }, [editor, node]);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        UPDATE_DETAILS_VARIANT_COMMAND,
        (variant) => {
          updateVariant(variant);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        TOGGLE_DETAILS_EDITABLE_COMMAND,
        () => {
          toggleEditable();
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, updateVariant, toggleEditable]);

  useLayoutEffect(() => {
    const detailsToolbarElem = detailsToolbarRef.current;
    if (detailsToolbarElem === null) return;
    const detailsElement = editor.getElementByKey(node.getKey());
    if (detailsElement === null) return;

    (detailsElement.style as any).anchorName = `--details-anchor-${node.getKey()}`;
    detailsToolbarElem.setAttribute(
      'style',
      `position-anchor: --details-anchor-${node.getKey()}; bottom: calc(anchor(top) + 0.25rem); justify-self: anchor-center;`,
    );

    anchorPolyfill([detailsElement, detailsToolbarElem]);
  }, [node, editor]);

  return (
    <div
      ref={detailsToolbarRef}
      className="details-toolbar flex px-4 absolute z-30 will-change-transform print:hidden gap-1"
    >
      <ToggleGroup
        type="single"
        variant="outline"
        className="bg-background"
        value={detailsVariant}
        onValueChange={updateVariant}
      >
        <ToggleGroupItem value="sharp" aria-label="Sharp corners" title="Sharp corners">
          <DetailsVariantIcon variant="sharp" />
        </ToggleGroupItem>
        <ToggleGroupItem value="rounded" aria-label="Rounded corners" title="Rounded corners">
          <DetailsVariantIcon variant="rounded" />
        </ToggleGroupItem>
      </ToggleGroup>

      <Toggle
        variant="outline"
        pressed={detailsEditable}
        onPressedChange={toggleEditable}
        aria-label={detailsEditable ? 'Make Read-only' : 'Make Editable'}
        title={detailsEditable ? 'Make Read-only' : 'Make Editable'}
      >
        <DetailsEditableIcon editable={detailsEditable} />
      </Toggle>

      <Toggle
        variant="outline"
        aria-label="Delete Details"
        title="Delete Details"
        onClick={deleteNode}
      >
        <Trash2Icon />
      </Toggle>
    </div>
  );
}

export default function DetailsToolbar({
  node,
  anchorElem = document.querySelector('.editor-container') as HTMLElement,
}: {
  node: DetailsContainerNode;
  anchorElem?: HTMLElement;
}) {
  return createPortal(<DetailsTools node={node} />, anchorElem);
}
