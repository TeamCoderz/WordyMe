/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';
import React, { memo, useEffect, useState } from 'react';
import { INSERT_IFRAME_COMMAND } from '@repo/editor/plugins/IFramePlugin';
import { IFrameNode } from '@repo/editor/nodes/IFrameNode';

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

function IFrameDialog({ node }: { node: IFrameNode | null }) {
  const [editor] = useLexicalComposerContext();
  const { updateEditorStoreState } = useActions();
  const [open, setOpen] = useState(true);
  const [formData, setFormData] = useState({
    src: '',
    altText: 'iframe',
    width: 560,
    height: 315,
    showCaption: true,
    id: '',
    style: '',
  });

  useEffect(() => {
    if (node) {
      editor.getEditorState().read(() => {
        const serializedNode = node.exportJSON();
        setFormData({
          src: serializedNode.src,
          altText: serializedNode.altText,
          width: serializedNode.width,
          height: serializedNode.height,
          showCaption: serializedNode.showCaption,
          id: serializedNode.id,
          style: serializedNode.style,
        });
      });
    } else {
      setFormData({
        src: '',
        altText: 'iframe',
        width: 560,
        height: 315,
        showCaption: true,
        id: '',
        style: '',
      });
    }
  }, [node]);

  const updateFormData = (name: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    if (!node) editor.dispatchCommand(INSERT_IFRAME_COMMAND, formData);
    else editor.update(() => node.update(formData));
    closeDialog();
    setTimeout(() => {
      editor.focus();
    }, 0);
  };

  const closeDialog = () => {
    setOpen(false);
    updateEditorStoreState('openDialog', null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) closeDialog();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Insert IFrame</DialogTitle>
          <DialogDescription className="sr-only">
            Add an iframe URL to insert into the editor.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Label htmlFor="src">URL</Label>
            <Input
              id="src"
              value={formData.src}
              onChange={(e) => {
                updateFormData('src', e.target.value);
                updateFormData('altText', e.target.value);
              }}
              placeholder="https://www.youtube.com/watch?v=id"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Label htmlFor="width">Width</Label>
            <Label htmlFor="height">Height</Label>
            <Input
              id="width"
              type="number"
              value={formData.width.toString()}
              onChange={(e) => updateFormData('width', e.target.value)}
            />
            <Input
              id="height"
              type="number"
              value={formData.height.toString()}
              onChange={(e) => updateFormData('height', e.target.value)}
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
            <Button type="submit" disabled={!formData.src}>
              Confirm
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default memo(IFrameDialog);
