/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { DownloadIcon, Trash2Icon, EditIcon, EyeIcon } from '@repo/ui/components/icons';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { CLICK_COMMAND, COMMAND_PRIORITY_LOW, NodeKey } from 'lexical';
import { cn } from '@repo/ui/lib/utils';
import { mergeRegister } from '@lexical/utils';
import { useCallback, useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@repo/ui/components/context-menu';
import { restoreFocus } from '@repo/editor/utils/restoreFocus';
import { handleDeleteNode } from '@repo/editor/utils/clipboard';
import { useActions } from '@repo/editor/store';
import { AttachmentCard } from '@repo/editor/components/AttachmentCard';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';

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

type AttachmentComponentProps = {
  nodeKey: NodeKey;
  name: string;
  size: number;
  url: string;
  signedUrl?: string;
};

export default function AttachmentComponent(props: AttachmentComponentProps) {
  const { nodeKey, name, size, url, signedUrl } = props;
  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected] = useLexicalNodeSelection(nodeKey);
  const { updateEditorStoreState } = useActions();
  const isEditable = useLexicalEditable();

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        CLICK_COMMAND,
        (event: MouseEvent) => {
          const attachmentElem = editor.getElementByKey(nodeKey);
          if (!attachmentElem) return false;
          if (event.target === attachmentElem || attachmentElem.contains(event.target as Node)) {
            setSelected(!isSelected);
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, isSelected, nodeKey, setSelected]);

  const onCloseAutoFocus = useCallback(
    (event: Event) => {
      event.preventDefault();
      restoreFocus(editor);
    },
    [editor],
  );

  const handleDeleteNodeCallback = useCallback(() => {
    handleDeleteNode(editor);
  }, [editor]);

  const handleEditNodeCallback = useCallback(() => {
    updateEditorStoreState('openDialog', 'attachment');
  }, [updateEditorStoreState]);

  const canView = isViewable(name);

  const handleDownload = async () => {
    const href = signedUrl ?? url;
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
      window.open(url, '_blank');
    }
  };

  if (!isEditable) {
    return <AttachmentCard name={name} size={size} url={url} signedUrl={signedUrl} />;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <AttachmentCard
          name={name}
          size={size}
          url={url}
          signedUrl={signedUrl}
          className={cn({
            selected: isSelected,
          })}
        />
      </ContextMenuTrigger>
      <ContextMenuContent onCloseAutoFocus={onCloseAutoFocus} className="w-60">
        <ContextMenuItem onClick={handleEditNodeCallback}>
          <EditIcon />
          Edit
        </ContextMenuItem>
        <ContextMenuItem disabled={!canView} asChild={canView}>
          {canView ? (
            <a
              href={`/attachment?${new URLSearchParams({ url: signedUrl ?? url, name }).toString()}`}
              data-new-split-tab="true"
            >
              <EyeIcon />
              View
            </a>
          ) : (
            <>
              <EyeIcon />
              <span className="sr-only">View</span>
            </>
          )}
        </ContextMenuItem>
        <ContextMenuItem onClick={handleDownload}>
          <DownloadIcon />
          Download
        </ContextMenuItem>
        <ContextMenuItem onClick={handleDeleteNodeCallback} variant="destructive">
          <Trash2Icon />
          Delete Node
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
