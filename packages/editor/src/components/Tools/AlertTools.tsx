/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';
import { AlertNode, AlertVariant } from '@repo/editor/nodes/AlertNode';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@repo/ui/components/toggle-group';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  InfoIcon,
  Trash2Icon,
} from '@repo/ui/components/icons';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { UPDATE_ALERT_VARIANT_COMMAND } from '@repo/editor/commands';
import { mergeRegister } from '@lexical/utils';
import { COMMAND_PRIORITY_LOW } from 'lexical';
import { useSelector, useActions } from '@repo/editor/store';
import { createPortal } from 'react-dom';

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

function AlertTools({ node }: { node: AlertNode }) {
  const [editor] = useLexicalComposerContext();
  const alertVariant = useSelector((state) => state.alertVariant);
  const { updateEditorStoreState } = useActions();

  const alertToolbarRef = useRef<HTMLDivElement | null>(null);

  const $updateToolbar = useCallback(() => {
    if (node.isAttached()) {
      const variant = node.getVariant();
      updateEditorStoreState('alertVariant', variant);
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
    (variant: AlertVariant) => {
      if (!variant) return;
      editor.update(() => {
        node.setVariant(variant);
      });
    },
    [editor, node],
  );

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        UPDATE_ALERT_VARIANT_COMMAND,
        (variant) => {
          updateVariant(variant);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, updateVariant]);

  useLayoutEffect(() => {
    const alertToolbarElem = alertToolbarRef.current;
    if (alertToolbarElem === null) return;
    const alertElement = editor.getElementByKey(node.getKey());
    if (alertElement === null) return;

    (alertElement.style as any).anchorName = `--alert-anchor-${node.getKey()}`;
    alertToolbarElem.setAttribute(
      'style',
      `position-anchor: --alert-anchor-${node.getKey()}; bottom: calc(anchor(top) + 0.25rem); justify-self: anchor-center;`,
    );

    anchorPolyfill([alertElement, alertToolbarElem]);
  }, [node, editor]);

  return (
    <div
      ref={alertToolbarRef}
      className="alert-toolbar flex px-4 absolute z-30 will-change-transform print:hidden gap-1"
    >
      <ToggleGroup
        type="single"
        variant="outline"
        className="bg-background"
        value={alertVariant}
        onValueChange={updateVariant}
      >
        <ToggleGroupItem value="default" aria-label="Default Alert" title="Default Alert">
          <AlertCircleIcon className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="success" aria-label="Success Alert" title="Success Alert">
          <CheckCircleIcon className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="error" aria-label="Error Alert" title="Error Alert">
          <XCircleIcon className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="warning" aria-label="Warning Alert" title="Warning Alert">
          <AlertTriangleIcon className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="info" aria-label="Info Alert" title="Info Alert">
          <InfoIcon className="size-4" />
        </ToggleGroupItem>
      </ToggleGroup>

      <ToggleGroup type="single" value="" variant="outline" className="bg-background">
        <ToggleGroupItem
          value="delete-alert"
          aria-label="Delete Alert"
          title="Delete Alert"
          onClick={deleteNode}
        >
          <Trash2Icon className="size-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

export default function AlertToolbar({
  node,
  anchorElem = document.querySelector('.editor-container') as HTMLElement,
}: {
  node: AlertNode;
  anchorElem?: HTMLElement;
}) {
  return createPortal(<AlertTools node={node} />, anchorElem);
}
