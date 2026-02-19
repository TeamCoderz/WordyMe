/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';
import { HorizontalRuleNode, HorizontalRuleVariant } from '@repo/editor/nodes/HorizontalRuleNode';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@repo/ui/components/toggle-group';
import { HorizontalRuleIcon } from '@repo/editor/components/icons';
import { Trash2Icon } from '@repo/ui/components/icons';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { UPDATE_HORIZONTAL_RULE_VARIANT_COMMAND } from '@repo/editor/commands';
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

function HrTools({ node }: { node: HorizontalRuleNode }) {
  const [editor] = useLexicalComposerContext();
  const horizontalRuleVariant = useSelector((state) => state.horizontalRuleVariant);
  const { updateEditorStoreState } = useActions();

  const hrToolbarRef = useRef<HTMLDivElement | null>(null);

  const $updateToolbar = useCallback(() => {
    if (node.isAttached()) {
      const variant = node.getVariant();
      updateEditorStoreState('horizontalRuleVariant', variant);
    }
  }, [node, updateEditorStoreState]);

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
    (variant: HorizontalRuleVariant) => {
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
        UPDATE_HORIZONTAL_RULE_VARIANT_COMMAND,
        (variant) => {
          updateVariant(variant);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, updateVariant]);

  useLayoutEffect(() => {
    const hrToolbarElem = hrToolbarRef.current;
    if (hrToolbarElem === null) return;
    const hrElement = editor.getElementByKey(node.getKey());
    if (hrElement === null) return;

    (hrElement.style as any).anchorName = `--hr-anchor-${node.getKey()}`;
    hrToolbarElem.setAttribute(
      'style',
      `position-anchor: --hr-anchor-${node.getKey()}; bottom: calc(anchor(top) + 0.25rem); justify-self: anchor-center;`,
    );

    anchorPolyfill([hrElement, hrToolbarElem]);
  }, [node, editor]);

  return (
    <div
      ref={hrToolbarRef}
      className="hr-toolbar flex px-4 absolute z-30 will-change-transform print:hidden gap-1"
    >
      <ToggleGroup
        type="single"
        variant="outline"
        className="bg-background"
        value={horizontalRuleVariant}
        onValueChange={updateVariant}
      >
        <ToggleGroupItem value="single" aria-label="Single Line" title="Single Line">
          <HorizontalRuleIcon variant="single" />
        </ToggleGroupItem>
        <ToggleGroupItem value="dashed" aria-label="Dashed Line" title="Dashed Line">
          <HorizontalRuleIcon variant="dashed" />
        </ToggleGroupItem>
        <ToggleGroupItem value="dotted" aria-label="Dotted Line" title="Dotted Line">
          <HorizontalRuleIcon variant="dotted" />
        </ToggleGroupItem>
        <ToggleGroupItem value="double" aria-label="Double Line" title="Double Line">
          <HorizontalRuleIcon variant="double" />
        </ToggleGroupItem>
      </ToggleGroup>

      <ToggleGroup type="single" value="" variant="outline" className="bg-background">
        <ToggleGroupItem
          value="delete-hr"
          aria-label="Delete Horizontal Rule"
          title="Delete Horizontal Rule"
          onClick={deleteNode}
        >
          <Trash2Icon className="size-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

export default function HrToolbar({
  node,
  anchorElem = document.querySelector('.editor-container') as HTMLElement,
}: {
  node: HorizontalRuleNode;
  anchorElem?: HTMLElement;
}) {
  return createPortal(<HrTools node={node} />, anchorElem);
}
