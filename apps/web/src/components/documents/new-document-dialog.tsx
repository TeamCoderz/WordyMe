import * as React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useSelector } from '@/store';
import { Button } from '@repo/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';
import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';
import { useCallback, useState } from 'react';
import { IconPicker } from '@repo/ui/components/icon-picker';
import { generatePositionKeyBetween, getSiblings } from '@repo/lib/utils/position';
import { useSuspenseQuery } from '@tanstack/react-query';
import { getAllDocumentsQueryOptions } from '@/queries/documents';
import { createNoteWithRevision } from '@repo/backend/sdk/notes.js';
import { toast } from 'sonner';
import { getInitialEditorState } from '@repo/editor/utils/getInitialEditorState';

interface DocumentDialogProps {
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  parentId?: string | null;
}

export function NewDocumentDialog({
  defaultOpen = true,
  onOpenChange,
  parentId,
}: DocumentDialogProps) {
  const navigate = useNavigate();
  const activeSpace = useSelector((state) => state.activeSpace);
  const { data: documents } = useSuspenseQuery({
    // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
    ...getAllDocumentsQueryOptions(activeSpace?.id!),
  });
  const [open, setOpen] = useState(defaultOpen);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors] = useState<Record<string, string>>({});
  const hasErrors = Object.keys(validationErrors).length > 0;
  const [formData, setFormData] = useState({
    name: '',
    handle: '',
    icon: 'file',
  });

  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    if (onOpenChange) onOpenChange(open);

    if (!open) {
      navigate({ to: '..' });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleIconChange = (icon: string) => {
    setFormData((prev) => ({ ...prev, icon }));
  };

  const handleClose = () => {
    setOpen(false);
    navigate({ to: '..' });
  };

  const generateNewDocumentPosition = useCallback(
    (parentId: string | null = null) => {
      const siblings = getSiblings(documents, parentId);
      const lastPosition = siblings[siblings.length - 1]?.position;
      return generatePositionKeyBetween(lastPosition, null);
    },
    [documents],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!activeSpace) {
        throw new Error('Missing space context');
      }

      const position = generateNewDocumentPosition(parentId);
      const content = getInitialEditorState(formData.name);

      const { data, error } = await createNoteWithRevision(
        {
          name: formData.name,
          space_id: activeSpace.id,
          icon: formData.icon,
          parent_id: parentId,
          position,
        },
        {
          content: JSON.stringify(content),
          text: formData.name,
        },
      );
      if (error) {
        throw error;
      }
      setOpen(false);
      toast('Document created', {
        description: 'Your document has been created',
      });
      navigate({ to: `/edit/${data?.document?.handle}` });
    } catch {
      toast('Failed to create document', {
        description: 'An error occurred while creating the document',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Document</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Document Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter document name"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="icon">Document Icon</Label>
              <IconPicker
                value={formData.icon}
                onValueChange={handleIconChange}
                searchable
                triggerPlaceholder="Select an icon"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || hasErrors}>
              {isSubmitting ? 'Creating...' : 'Create Document'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
