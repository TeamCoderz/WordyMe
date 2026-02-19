/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';
import { AttachmentNode } from '@repo/editor/nodes/AttachmentNode';
import { useCallback, useLayoutEffect, useRef } from 'react';
import { EditIcon, Trash2Icon, DownloadIcon } from '@repo/ui/components/icons';
import { Toggle } from '@repo/ui/components/toggle';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useActions } from '@repo/editor/store';
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

function AttachmentTools({ node }: { node: AttachmentNode }) {
  const [editor] = useLexicalComposerContext();
  const { updateEditorStoreState } = useActions();
  const attachmentToolbarRef = useRef<HTMLDivElement | null>(null);

  const openAttachmentDialog = () => updateEditorStoreState('openDialog', 'attachment');

  const deleteNode = useCallback(() => {
    editor.update(() => {
      node.selectPrevious();
      node.remove();
    });
  }, [editor, node]);

  useLayoutEffect(() => {
    const attachmentToolbarElem = attachmentToolbarRef.current;
    if (attachmentToolbarElem === null) return;
    const attachmentElement = editor.getElementByKey(node.getKey());
    if (attachmentElement === null) return;

    (attachmentElement.style as any).anchorName = `--attachment-anchor-${node.getKey()}`;
    attachmentToolbarElem.setAttribute(
      'style',
      `position-anchor: --attachment-anchor-${node.getKey()}; bottom: calc(anchor(top) + 0.25rem); justify-self: anchor-center;`,
    );

    anchorPolyfill([attachmentElement, attachmentToolbarElem]);
  }, [node, editor]);

  return (
    <div
      ref={attachmentToolbarRef}
      className="attachment-toolbar flex px-4 absolute z-30 will-change-transform print:hidden gap-1"
    >
      <Toggle
        variant="outline"
        className="bg-background"
        value="edit"
        onClick={openAttachmentDialog}
        aria-label="Edit attachment"
        title="Edit attachment"
      >
        <EditIcon />
      </Toggle>
      <Toggle
        variant="outline"
        className="bg-background"
        value="download"
        aria-label="Download attachment"
        title="Download attachment"
        asChild
      >
        <a href={node.getSignedUrl() ?? node.getUrl()} download={node.getName()}>
          <DownloadIcon />
        </a>
      </Toggle>
      <Toggle
        variant="outline"
        className="bg-background"
        value="delete"
        onClick={deleteNode}
        aria-label="Delete attachment"
        title="Delete attachment"
      >
        <Trash2Icon />
      </Toggle>
    </div>
  );
}

export default function AttachmentToolbar({
  node,
  anchorElem = document.querySelector('.editor-container') as HTMLElement,
}: {
  node: AttachmentNode;
  anchorElem?: HTMLElement;
}) {
  return createPortal(<AttachmentTools node={node} />, anchorElem);
}
