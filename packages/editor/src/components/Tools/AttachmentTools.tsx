/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';
import { AttachmentNode } from '@repo/editor/nodes/AttachmentNode';
import { useCallback, useLayoutEffect, useRef } from 'react';
import { EditIcon, Trash2Icon, DownloadIcon, EyeIcon } from '@repo/ui/components/icons';
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

const VIEWABLE_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'bmp',
  'ico',
  'mp4',
  'webm',
  'ogg',
  'mov',
  'avi',
  'mkv',
  'mp3',
  'wav',
  'm4a',
  'aac',
  'flac',
  'pdf',
];

function isViewable(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return VIEWABLE_EXTENSIONS.includes(ext);
}

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

  const handleDownload = async () => {
    const href = node.getSignedUrl() ?? node.getUrl() ?? '';
    const name = node.getName();
    try {
      const res = await fetch(href);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(href, '_blank');
    }
  };

  const canView = isViewable(node.getName());
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
        value="view"
        aria-label="View attachment"
        title="View attachment"
        disabled={!canView}
        asChild={canView}
      >
        {canView ? (
          <a
            href={`/attachment?${new URLSearchParams({ url: node.getSignedUrl() ?? node.getUrl() ?? '', name: node.getName() }).toString()}`}
            data-new-split-tab="true"
          >
            <EyeIcon />
            <span className="sr-only">View</span>
          </a>
        ) : (
          <>
            <EyeIcon />
            <span className="sr-only">View</span>
          </>
        )}
      </Toggle>
      <Toggle
        variant="outline"
        className="bg-background"
        value="download"
        aria-label="Download attachment"
        title="Download attachment"
        onClick={handleDownload}
      >
        <DownloadIcon />
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
  anchorElem,
}: {
  node: AttachmentNode;
  anchorElem?: HTMLElement;
}) {
  const [editor] = useLexicalComposerContext();
  const rootElement = editor.getRootElement();
  const container =
    anchorElem ?? rootElement?.closest<HTMLElement>('.editor-container') ?? document.body;
  return createPortal(<AttachmentTools node={node} />, container);
}
