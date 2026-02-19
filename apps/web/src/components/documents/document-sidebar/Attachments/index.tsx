/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { JSX } from 'react';

import { useEffect, useState } from 'react';
import { PaperclipIcon } from '@repo/ui/components/icons';
import { useComposerContext } from '@repo/editor/hooks/useComposerContext';
import { AttachmentCard } from '@repo/editor/components/AttachmentCard';
import { AttachmentNode, $isAttachmentNode } from '@repo/editor/nodes/AttachmentNode';
import { ElementNode, $isElementNode, $getRoot } from '@repo/editor/lexical';

export function AttachmentsList({
  attachmentNodes,
}: {
  attachmentNodes: Array<AttachmentNode>;
}): JSX.Element {
  return (
    <div className="flex flex-col text-sm p-3 gap-2 h-full overflow-x-hidden overflow-y-auto scrollbar-thin">
      {attachmentNodes.map((node) => {
        return (
          <AttachmentCard
            key={node.__key}
            name={node.__name}
            size={node.__size}
            url={node.__url}
            signedUrl={node.__signedUrl}
          />
        );
      })}
    </div>
  );
}

export function Attachments() {
  const [editor] = useComposerContext();
  const [attachmentNodes, setAttachmentNodes] = useState<Array<AttachmentNode>>([]);
  useEffect(() => {
    let currentAttachments: Array<AttachmentNode> = [];
    const updateCurrentAttachments = (node: ElementNode) => {
      for (const child of node.getChildren()) {
        if ($isAttachmentNode(child)) {
          currentAttachments.push(child);
        } else if ($isElementNode(child)) {
          updateCurrentAttachments(child);
        }
      }
    };

    editor.getEditorState().read(() => {
      currentAttachments = [];
      updateCurrentAttachments($getRoot());
      setAttachmentNodes(currentAttachments);
    });
    return editor.registerMutationListener(AttachmentNode, () => {
      editor.getEditorState().read(() => {
        currentAttachments = [];
        updateCurrentAttachments($getRoot());
        setAttachmentNodes(currentAttachments);
      });
    });
  }, [editor]);
  return <AttachmentsList attachmentNodes={attachmentNodes} />;
}

export function AttachmentsHeader() {
  return (
    <div className="flex items-center gap-2 p-4 shrink-0 truncate">
      <PaperclipIcon className="size-4" />
      Attachments
    </div>
  );
}
