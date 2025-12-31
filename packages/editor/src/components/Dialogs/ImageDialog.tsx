'use client';
import { INSERT_IMAGE_COMMAND, InsertImagePayload } from '@repo/editor/plugins/ImagePlugin';
import { useEffect, useState, memo } from 'react';
import { isMimeType, mediaFileReader } from '@lexical/utils';
import { ImageNode } from '@repo/editor/nodes/ImageNode';
import { getImageDimensions } from '@repo/editor/utils/nodeUtils';
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
import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';
import { Switch } from '@repo/ui/components/switch';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useActions } from '@repo/editor/store';
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@repo/ui/components/dropzone';
import { Loader2Icon } from '@repo/ui/components/icons';

const ACCEPTABLE_IMAGE_TYPES = ['image/'];

function ImageDialog({ node }: { node: ImageNode | null }) {
  const [editor] = useLexicalComposerContext();
  const { updateEditorStoreState } = useActions();
  const { uploadImage, getImageSignedUrl } = useActions();
  const [isOpen, setIsOpen] = useState(true);
  const [formData, setFormData] = useState<InsertImagePayload>({
    src: '',
    altText: '',
    width: 0,
    height: 0,
    showCaption: true,
    signedUrl: '',
    id: '',
    style: '',
  });

  const [files, setFiles] = useState<File[] | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const isFileUploadPending = files && files.length > 0 && files[0].size > 0;

  useEffect(() => {
    if (node) {
      editor.getEditorState().read(() => {
        const serializedNode = node.exportJSON();
        const signedUrl = node.getSignedUrl();
        setFormData({
          ...serializedNode,
          signedUrl,
        });
        if (signedUrl) {
          setFiles([new File([], serializedNode.altText)]);
        }
      });
    } else {
      setFormData({
        src: '',
        altText: '',
        width: 0,
        height: 0,
        showCaption: true,
        signedUrl: '',
        id: '',
        style: '',
      });
    }
  }, [node]);

  const updateFormData = async (name: string, value: string | number | boolean) => {
    setIsFormDirty(true);
    if (name === 'src' && typeof value === 'string') {
      let signedUrl = undefined;
      try {
        const dimensions = await getImageDimensions(value);
        if (value.startsWith('/images/')) {
          const filename = value.split('/').pop()!;
          const { data: signedUrlData } = await getImageSignedUrl(filename);
          signedUrl = signedUrlData?.signedUrl;
        }
        setFormData({
          ...formData,
          ...dimensions,
          signedUrl,
          [name]: value,
        });
      } catch {
        setFormData({ ...formData, signedUrl, [name]: value });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const readFiles = async (files?: File[]) => {
    if (!files || files.length === 0) return;
    const filesResult = await mediaFileReader(
      Array.from(files),
      [ACCEPTABLE_IMAGE_TYPES].flatMap((x) => x),
    );
    const { file, result } = filesResult[0];
    if (isMimeType(file, ACCEPTABLE_IMAGE_TYPES)) {
      return result;
    }
    return null;
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const { data, error } = await uploadImage(file);
      if (error || !data) {
        throw new Error('Uploading image failed');
      }
      const filename = data.path.split('/').pop()!;
      const { data: signedUrlData } = await getImageSignedUrl(filename);
      return {
        ...formData,
        src: `/images/${data.path.split('/').pop()}`,
        signedUrl: signedUrlData?.signedUrl,
        altText: file.name,
      };
    } catch {
      editor.dispatchCommand(ANNOUNCE_COMMAND, {
        type: 'error',
        message: {
          title: 'Uploading image failed',
          subtitle: 'Unsupported file type',
        },
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const insertImage = (payload: InsertImagePayload) => {
    if (!node) editor.dispatchCommand(INSERT_IMAGE_COMMAND, payload);
    else editor.update(() => node.update(payload));
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
      insertImage(result);
    } else {
      insertImage(formData);
    }
    setIsFormDirty(false);
    closeDialog();
  };

  const handleClose = () => {
    closeDialog();
  };

  const handleDrop = async (files: File[]) => {
    setFiles(files);
    setIsFormDirty(true);
    const result = await readFiles(files);
    if (!result) return;
    const dimensions = await getImageDimensions(result);
    setFormData({
      ...formData,
      ...dimensions,
      src: '',
      altText: files[0].name,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Insert Image</DialogTitle>
          <DialogDescription className="sr-only">
            Upload an image or add an image URL to insert into the editor.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Dropzone onDrop={handleDrop} accept={{ 'image/*': [] }} src={files} maxFiles={1}>
                <DropzoneEmptyState />
                <DropzoneContent />
              </Dropzone>
            </div>
          </div>

          <div className="space-y-4">
            <Label htmlFor="src">URL</Label>
            <Input
              id="src"
              value={formData.src}
              disabled={isUploading || isFileUploadPending}
              onChange={(e) => updateFormData('src', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Label htmlFor="width">Width</Label>
            <Label htmlFor="height">Height</Label>
            <Input
              id="width"
              type="number"
              value={formData.width}
              onChange={(e) => updateFormData('width', parseInt(e.target.value) || 0)}
            />
            <Input
              id="height"
              type="number"
              value={formData.height}
              onChange={(e) => updateFormData('height', parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-4">
            <Label htmlFor="altText">Alt Text</Label>
            <Input
              id="altText"
              value={formData.altText}
              onChange={(e) => updateFormData('altText', e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Label htmlFor="show-caption" className="cursor-pointer flex-1">
              Show Caption
            </Label>
            <Switch
              id="show-caption"
              checked={formData.showCaption}
              onCheckedChange={(checked) => updateFormData('showCaption', checked)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isFormDirty || isUploading}>
              {isUploading && <Loader2Icon className="size-4 animate-spin" />}
              {isUploading ? 'Uploading' : 'Confirm'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default memo(ImageDialog);
