/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';
import { INSERT_SCORE_COMMAND, InsertScorePayload } from '@repo/editor/plugins/ScorePlugin';
import { useEffect, useState, memo } from 'react';
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
import { getImageDimensions } from '@repo/editor/utils/nodeUtils';
import { ScoreNode } from '@repo/editor/nodes/ScoreNode';
import { renderScore } from '@repo/editor/utils/renderScore';

function ScoreDialog({ node }: { node: ScoreNode | null }) {
  const [editor] = useLexicalComposerContext();
  const {
    updateEditorStoreState,
    uploadAttachment,
    getAttachmentSignedUrl,
    uploadImage,
    getImageSignedUrl,
  } = useActions();
  const [isOpen, setIsOpen] = useState(true);
  const [formData, setFormData] = useState<InsertScorePayload>({
    src: '',
    altText: '',
    width: 0,
    height: 0,
    showCaption: true,
    signedUrl: '',
    attachmentUrl: '',
    attachmentSignedUrl: '',
    id: '',
    style: 'filter:auto',
  });

  const [files, setFiles] = useState<File[] | undefined>();
  const [dataUrl, setDataUrl] = useState<string | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const isFileUploadPending = files && files.length > 0 && files[0].size > 0;

  useEffect(() => {
    if (node) {
      editor.getEditorState().read(() => {
        const serializedNode = node.exportJSON();
        const signedUrl = node.getSignedUrl();
        const attachmentSignedUrl = node.getAttachmentSignedUrl();
        setFormData({
          ...serializedNode,
          signedUrl,
          attachmentSignedUrl,
        });
        if (attachmentSignedUrl) {
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
        attachmentUrl: '',
        attachmentSignedUrl: '',
        id: '',
        style: 'filter:auto',
      });
    }
  }, [node]);

  const dataUrlToFile = (dataUrl: string, filename: string): File => {
    const [header, data] = dataUrl.split(',');
    const mime = header.split(';')[0].split(':')[1];
    const svgText = decodeURIComponent(data);
    return new File([svgText], filename, { type: mime });
  };

  const updateFormData = async (name: string, value: string | number | boolean) => {
    setIsFormDirty(true);
    setFormData({ ...formData, [name]: value });
  };

  const uploadScore = async (file: File, dataUrl: string) => {
    setIsUploading(true);
    const { data: attachmentData, error: attachmentError } = await uploadAttachment(file);
    if (attachmentError || !attachmentData) {
      throw new Error('Uploading score failed');
    }
    const attachmentFilename = attachmentData.path.split('/').pop()!;
    const { data: attachmentSignedUrlData, error: attachmentSignedUrlError } =
      await getAttachmentSignedUrl(attachmentFilename);
    if (attachmentSignedUrlError || !attachmentSignedUrlData) {
      throw new Error('Failed to get attachment signed URL');
    }
    // Upload SVG file and get signed URL
    const altText = file.name.replace(/\.mxl$/, '');
    const svgFile = dataUrlToFile(dataUrl, `${altText}.svg`);
    const { data: imageData, error: imageError } = await uploadImage(svgFile);
    if (imageError || !imageData) {
      throw new Error('Uploading image failed');
    }
    const imageFilename = imageData.path.split('/').pop()!;
    const { data: imageSignedUrlData, error: imageSignedUrlError } =
      await getImageSignedUrl(imageFilename);
    if (imageSignedUrlError || !imageSignedUrlData) {
      throw new Error('Failed to get image signed URL');
    }

    return {
      attachmentUrl: `/attatchements/${attachmentFilename}`,
      attachmentSignedUrl: attachmentSignedUrlData.signedUrl,
      src: `/images/${imageFilename}`,
      signedUrl: imageSignedUrlData.signedUrl,
    };
  };

  const insertScore = (payload: InsertScorePayload) => {
    if (!node) editor.dispatchCommand(INSERT_SCORE_COMMAND, payload);
    else editor.update(() => node.update(payload));
  };

  const closeDialog = () => {
    updateEditorStoreState('openDialog', null);
    setIsOpen(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (isFileUploadPending) {
        if (!dataUrl) {
          throw new Error('Failed to render score');
        }
        const payload = await uploadScore(files[0], dataUrl);
        insertScore({
          ...formData,
          ...payload,
        });
      } else {
        insertScore(formData);
      }
      setIsFormDirty(false);
      setDataUrl(undefined);
      setFiles(undefined);
      closeDialog();
    } catch (error) {
      editor.dispatchCommand(ANNOUNCE_COMMAND, {
        type: 'error',
        message: {
          title: 'Failed to insert score',
          subtitle: error instanceof Error ? error.message : 'Please try again later',
        },
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    closeDialog();
  };

  const handleDrop = async (files: File[]) => {
    const mxlFile = files.find((f) => f.name.endsWith('.mxl'));
    if (!mxlFile) {
      editor.dispatchCommand(ANNOUNCE_COMMAND, {
        type: 'error',
        message: {
          title: 'Invalid file type',
          subtitle: 'Please upload a .mxl file',
        },
      });
      return;
    }
    setFiles([mxlFile]);
    setIsFormDirty(true);
    setIsRendering(true);
    try {
      const dataUrl = await renderScore(mxlFile);
      setDataUrl(dataUrl);
      const dimensions = await getImageDimensions(dataUrl);
      setFormData({
        ...formData,
        src: '',
        altText: mxlFile.name.replace(/\.mxl$/, ''),
        ...dimensions,
      });
    } catch {
      editor.dispatchCommand(ANNOUNCE_COMMAND, {
        type: 'error',
        message: {
          title: 'Rendering score failed',
          subtitle: 'Please try again later',
        },
      });
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{node ? 'Edit Score' : 'Insert Score'}</DialogTitle>
          <DialogDescription className="sr-only">
            Upload a .mxl file to insert a score into the editor.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Dropzone
                onDrop={handleDrop}
                accept={{ 'application/xml+musicxml': ['.mxl'] }}
                src={files}
                maxFiles={1}
              >
                <DropzoneEmptyState />
                <DropzoneContent />
              </Dropzone>
            </div>
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
            <Button type="submit" disabled={!isFormDirty || isUploading || isRendering}>
              {isUploading && <Loader2Icon className="size-4 animate-spin" />}
              {isRendering && <Loader2Icon className="size-4 animate-spin" />}
              {isUploading ? 'Uploading' : isRendering ? 'Rendering' : 'Confirm'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default memo(ScoreDialog);
