import { DownloadIcon, Trash2Icon, EditIcon } from '@repo/ui/components/icons';
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
        <ContextMenuItem asChild>
          <a href={signedUrl ?? url} download={name} aria-label={`Download ${name}`}>
            <DownloadIcon />
            Download
          </a>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleDeleteNodeCallback} variant="destructive">
          <Trash2Icon />
          Delete Node
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
