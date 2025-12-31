'use client';
import { INSERT_TABLE_COMMAND } from '@repo/editor/nodes/TableNode';
import React, { memo, useState } from 'react';

import { Button } from '@repo/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';
import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';
import { Switch } from '@repo/ui/components/switch';
import { MinusIcon, PlusIcon } from '@repo/ui/components/icons';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useActions } from '@repo/editor/store';

const initialFormData = { rows: '3', columns: '3', includeHeaders: true };

function TableDialog() {
  const [editor] = useLexicalComposerContext();
  const [formData, setFormData] = useState(initialFormData);
  const [open, setOpen] = useState(true);
  const { updateEditorStoreState } = useActions();
  const setRows = (rows: number) => {
    setFormData({ ...formData, rows: Math.max(1, rows).toString() });
  };
  const setColumns = (columns: number) => {
    setFormData({ ...formData, columns: Math.max(1, columns).toString() });
  };
  const setIncludeHeaders = (includeHeaders: boolean) => {
    setFormData({ ...formData, includeHeaders });
  };
  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    editor.dispatchCommand(INSERT_TABLE_COMMAND, formData);
    closeDialog();
    setTimeout(() => {
      editor.focus();
    }, 0);
  };

  const closeDialog = () => {
    setOpen(false);
    updateEditorStoreState('openDialog', null);
    setFormData(initialFormData);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) closeDialog();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Insert Table</DialogTitle>
          <DialogDescription className="sr-only">
            Specify the number of rows and columns, and whether to include headers.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Label htmlFor="rows">Rows</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                type="button"
                onClick={() => setRows(+formData.rows - 1)}
              >
                <MinusIcon />
              </Button>
              <Input
                id="rows"
                type="number"
                value={formData.rows}
                onChange={(e) => setRows(+e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                type="button"
                onClick={() => setRows(+formData.rows + 1)}
              >
                <PlusIcon />
              </Button>
            </div>
          </div>
          <div className="space-y-4">
            <Label htmlFor="columns">Columns</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                type="button"
                onClick={() => setColumns(+formData.columns - 1)}
              >
                <MinusIcon />
              </Button>
              <Input
                id="columns"
                type="number"
                value={formData.columns}
                onChange={(e) => setColumns(+e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                type="button"
                onClick={() => setColumns(+formData.columns + 1)}
              >
                <PlusIcon />
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Label htmlFor="include-headers" className="cursor-pointer flex-1">
              Include Headers
            </Label>
            <Switch
              id="include-headers"
              checked={formData.includeHeaders}
              onCheckedChange={setIncludeHeaders}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="submit">Insert</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default memo(TableDialog);
