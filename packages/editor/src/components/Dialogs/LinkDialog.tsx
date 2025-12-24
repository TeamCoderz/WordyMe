'use client';
import { $getNodeByKey, $getSelection, $isRangeSelection, isHTMLElement } from 'lexical';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TOGGLE_LINK_COMMAND, type LinkNode } from '@lexical/link';
import { $isImageNode } from '@repo/editor/nodes/ImageNode';
import { $isMathNode } from '@repo/editor/nodes/MathNode';
import { $isTableNode } from '@repo/editor/nodes/TableNode';
import { getEditorNodes } from '@repo/editor/utils/getEditorNodes';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useActions } from '@repo/editor/store';

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
import { RadioGroup, RadioGroupItem } from '@repo/ui/components/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import { UnlinkIcon } from '@repo/ui/components/icons';
import { formatId } from '@repo/lib/utils/id';
function LinkDialog({ node }: { node: LinkNode | null }) {
  const [editor] = useLexicalComposerContext();
  const [url, setUrl] = useState<string>('https://');
  const [rel, setRel] = useState<string | null>('external');
  const [target, setTarget] = useState<string | null>('_blank');
  const [figure, setFigure] = useState<string>('self');
  const inputRef = useRef<HTMLInputElement>(null);
  const { updateEditorStoreState } = useActions();
  const figures = useMemo(() => {
    return editor.getEditorState().read(() => {
      const nodes = getEditorNodes(editor).filter(
        (node) => $isImageNode(node) || $isMathNode(node) || $isTableNode(node),
      );
      const nodeDomMap = nodes.reduce((map, node) => {
        const element = $isTableNode(node)
          ? editor.getElementByKey(node.getKey())
          : node.exportDOM(editor).element;
        if (!isHTMLElement(element)) return map;
        map.set(node.getKey(), element);
        return map;
      }, new Map<string, HTMLElement>());
      return nodeDomMap;
    });
  }, [editor]);

  useEffect(() => {
    setUrl(node?.__url ?? 'https://');
    setRel(node?.__rel ?? 'external');
    setTarget(node?.__target ?? '_blank');
    if (node?.__rel === 'bookmark') {
      const id = node.__url.slice(1);
      const figureKey = [...figures.entries()].find(([, element]) => element.id === id)?.[0];
      const target = node.__target;
      const figure = figureKey ? figureKey : target === '_self' ? 'self' : 'none';
      setFigure(figure);
    }
  }, [node]);

  const updateUrl = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const url = rel === 'bookmark' ? formatId(value).padStart(1, '#') : value;
    setUrl(url);
  };

  const updateRel = (value: string) => {
    setRel(value);
    const nodeRel = node?.__rel ?? 'external';
    const defaultUrl = value === 'bookmark' ? getBookmarkUrl() : 'https://';
    const nodeUrl = node?.__url ?? defaultUrl;
    const url = value === nodeRel ? nodeUrl : defaultUrl;
    setUrl(url);
    const target = value === 'external' ? '_blank' : figure === 'self' ? '_self' : null;
    setTarget(target);
  };

  const updateFigure = (value: string) => {
    setFigure(value);
    if (value === 'self') setTarget('_self');
    else setTarget(null);
  };

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    if (rel === 'bookmark' && figure) setNodeId(figure, url.slice(1));
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      if (!node) {
        if (selection.isCollapsed()) {
          selection.insertText(url);
          selection.anchor.offset -= url.length;
        }
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, { url, rel, target });
      } else {
        node.select(0, 1).insertText(url);
        node.setURL(url);
        node.setRel(rel);
        node.setTarget(target);
      }
    });
    closeDialog();
    setTimeout(() => {
      editor.focus();
    }, 0);
  };

  const closeDialog = () => {
    updateEditorStoreState('openDialog', null);
  };

  const handleClose = () => {
    closeDialog();
  };

  const handleDelete = () => {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    closeDialog();
  };

  const getBookmarkUrl = useCallback(() => {
    return editor.getEditorState().read(() => {
      if (node && node.getRel() === 'bookmark') return decodeURIComponent(node.getURL());
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return '#';
      const textContent = selection.isCollapsed()
        ? selection.focus.getNode().getTextContent()
        : selection.getTextContent();
      return `#${formatId(textContent)}`;
    });
  }, [editor, node]);

  const setNodeId = (key: string, id: string) => {
    editor.update(() => {
      const node = $getNodeByKey(key);
      if (!($isImageNode(node) || $isMathNode(node) || $isTableNode(node))) return;
      node.setId(id);
    });
  };

  // Focus input after render
  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, []);

  return (
    <Dialog open onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Insert Link</DialogTitle>
          <DialogDescription className="sr-only">
            Add a link to an external or internal resource.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Label htmlFor="rel">Target</Label>
            <RadioGroup
              id="rel"
              defaultValue={rel || 'external'}
              className="flex"
              onValueChange={updateRel}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="external" id="external" />
                <Label htmlFor="external">External</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bookmark" id="bookmark" />
                <Label htmlFor="bookmark">Internal</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-4">
            <Label htmlFor="url">URL</Label>
            <Input id="url" ref={inputRef} value={url} onChange={updateUrl} autoComplete="off" />
          </div>
          {rel === 'bookmark' && (
            <div className="space-y-4">
              <Label htmlFor="figure">Figure</Label>
              <Select value={figure} onValueChange={updateFigure}>
                <SelectTrigger className="w-full !h-full min-h-9">
                  <SelectValue placeholder="Select a figure" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Self</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                  {[...figures.keys()].map((key) => (
                    <SelectItem key={key} value={key}>
                      <div
                        className="w-full"
                        dangerouslySetInnerHTML={{
                          __html: figures.get(key)!.outerHTML,
                        }}
                      />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            {node && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                className="mr-auto"
              >
                <UnlinkIcon className="h-4 w-4 mr-2" />
                Unlink
              </Button>
            )}
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!url}>
              Confirm
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default memo(LinkDialog);
