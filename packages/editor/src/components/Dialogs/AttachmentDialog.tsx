'use client';
import { useEffect, useState, memo } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useActions } from '@repo/editor/store';
import { ANNOUNCE_COMMAND } from '@repo/editor/commands';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';
import { Button } from '@repo/ui/components/button';
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@repo/ui/components/dropzone';
import { Loader2Icon } from '@repo/ui/components/icons';
import {
  INSERT_ATTACHMENT_COMMAND,
  type InsertAttachmentPayload,
} from '@repo/editor/plugins/AttachmentPlugin';
import { AttachmentNode } from '@repo/editor/nodes/AttachmentNode';
import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';

function AttachmentDialog({ node }: { node: AttachmentNode | null }) {
  const [editor] = useLexicalComposerContext();
  const { updateEditorStoreState } = useActions();
  const { uploadAttachment, getAttachmentSignedUrl } = useActions();
  const [isOpen, setIsOpen] = useState(true);
  const [formData, setFormData] = useState<InsertAttachmentPayload>({
    name: '',
    size: 0,
    url: '',
    signedUrl: '',
  });

  const [files, setFiles] = useState<File[] | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const isFileUploadPending = files && files.length > 0 && files[0].size > 0;

  useEffect(() => {
    if (node) {
      editor.getEditorState().read(() => {
        setFormData({
          name: node.getName(),
          size: node.getSize(),
          url: node.getUrl(),
          signedUrl: node.getSignedUrl(),
        });
        setFiles([new File([], node.getName())]);
      });
    } else {
      setFormData({
        name: '',
        size: 0,
        url: '',
        signedUrl: '',
      });
      setFiles(undefined);
    }
  }, [node]);

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const { data, error } = await uploadAttachment(file);
      if (error || !data) {
        throw new Error('Uploading attachment failed');
      }
      const filename = data.path.split('/').pop()!;
      const { data: signedUrlData } = await getAttachmentSignedUrl(filename);
      return {
        name: file.name,
        size: file.size,
        url: `/attatchements/${filename}`,
        signedUrl: signedUrlData?.signedUrl,
      } as InsertAttachmentPayload;
    } catch {
      editor.dispatchCommand(ANNOUNCE_COMMAND, {
        type: 'error',
        message: {
          title: 'Uploading attachment failed',
          subtitle: 'Unsupported file or network error',
        },
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const insertAttachment = (payload: InsertAttachmentPayload) => {
    if (!node) {
      editor.dispatchCommand(INSERT_ATTACHMENT_COMMAND, payload);
    } else {
      editor.update(() => node.update(payload));
    }
  };

  const closeDialog = () => {
    updateEditorStoreState('openDialog', null);
    setIsOpen(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isFileUploadPending) {
      const result = await uploadFile(files[0]);
      if (!result) return;
      insertAttachment(result);
    } else if (formData.url && formData.name) {
      insertAttachment(formData);
    }
    closeDialog();
  };

  const handleClose = () => {
    closeDialog();
  };

  const handleDrop = async (files: File[]) => {
    setFiles(files);
    const file = files?.[0];
    if (!file) return;
    setFormData({
      ...formData,
      name: file.name,
      size: file.size,
      url: '',
      signedUrl: undefined,
    });
  };

  const updateUrl = async (value: string) => {
    let signedUrl = undefined;
    if (value.startsWith('/attatchements/')) {
      const filename = value.split('/').pop()!;
      const { data: signedUrlData } = await getAttachmentSignedUrl(filename);
      signedUrl = signedUrlData?.signedUrl;
    }
    setFormData({ ...formData, url: value, signedUrl });
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{node ? 'Edit Attachment' : 'Insert Attachment'}</DialogTitle>
          <DialogDescription className="sr-only">
            Upload an attachment to insert into the editor.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Dropzone onDrop={handleDrop} src={files} maxFiles={1} maxSize={1024 * 1024 * 10}>
                <DropzoneEmptyState />
                <DropzoneContent />
              </Dropzone>
            </div>
          </div>

          <div className="space-y-4">
            <Label htmlFor="src">URL</Label>
            <Input
              id="src"
              value={formData.url}
              disabled={isUploading || isFileUploadPending}
              onChange={(e) => updateUrl(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={((!files || files.length === 0) && (!node || !formData.url)) || isUploading}
            >
              {isUploading && <Loader2Icon className="size-4 animate-spin" />}
              {isUploading ? 'Uploading' : node ? 'Update' : 'Confirm'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default memo(AttachmentDialog);
