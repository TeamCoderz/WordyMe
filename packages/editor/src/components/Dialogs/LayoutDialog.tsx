'use client';
import { INSERT_LAYOUT_COMMAND } from '@repo/editor/plugins/LayoutPlugin';
import React, { memo } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';
import { Button } from '@repo/ui/components/button';
import { RadioGroup, RadioGroupItem } from '@repo/ui/components/radio-group';
import { Label } from '@repo/ui/components/label';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useActions } from '@repo/editor/store';

const LAYOUTS = [
  { label: '2 columns (equal)', value: '1fr 1fr', columns: [1, 1] },
  { label: '2 columns (25:75)', value: '1fr 3fr', columns: [1, 3] },
  { label: '2 columns (75:25)', value: '3fr 1fr', columns: [3, 1] },
  {
    label: '3 columns (equal)',
    value: '1fr 1fr 1fr',
    columns: [1, 1, 1],
  },
  {
    label: '3 columns (25:50:25)',
    value: '1fr 2fr 1fr',
    columns: [1, 2, 1],
  },
  {
    label: '4 columns (equal)',
    value: '1fr 1fr 1fr 1fr',
    columns: [1, 1, 1, 1],
  },
];

const ColumnVisual = ({ columns }: { columns: number[] }) => {
  const totalWidth = columns.reduce((sum, width) => sum + width, 0);

  return (
    <div className="flex gap-1 mt-3">
      {columns.map((width, index) => (
        <div
          key={index}
          className={`rounded-md h-16 min-w-4 bg-gray-200 dark:bg-gray-800 group-has-checked:bg-primary`}
          style={{
            width: `${(width / totalWidth) * 100}%`,
          }}
        />
      ))}
    </div>
  );
};

function LayoutDialog() {
  const [editor] = useLexicalComposerContext();
  const [formData, setFormData] = React.useState({ layout: LAYOUTS[0].value });
  const [open, setOpen] = React.useState(true);
  const { updateEditorStoreState } = useActions();

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    editor.dispatchCommand(INSERT_LAYOUT_COMMAND, formData.layout);
    closeDialog();
  };

  const closeDialog = () => {
    updateEditorStoreState('openDialog', null);
    setOpen(false);
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
          <DialogTitle>Insert Layout</DialogTitle>
          <DialogDescription className="sr-only">
            Specify the number of columns and their widths.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <RadioGroup
            id="column-layout"
            value={formData.layout}
            onValueChange={(value) => setFormData({ ...formData, layout: value })}
            className="grid grid-cols-2 sm:grid-cols-3 gap-4"
          >
            {LAYOUTS.map(({ label, value, columns }) => (
              <Label
                key={value}
                className="group flex flex-col items-stretch relative p-4 rounded-lg border-2 cursor-pointer border-transparent hover:border-gray-200 has-checked:border-primary has-checked:bg-gray-100 dark:hover:border-gray-700 dark:has-checked:border-primary dark:has-checked:bg-gray-900"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value={value} checked={formData.layout === value} />
                  <span className="text-sm font-normal truncate text-gray-900 dark:text-gray-100">
                    {label}
                  </span>
                </div>
                <ColumnVisual columns={columns} />
              </Label>
            ))}
          </RadioGroup>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Confirm</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default memo(LayoutDialog);
