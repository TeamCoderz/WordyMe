import * as React from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';
import { Textarea } from '@repo/ui/components/textarea';
import { toast } from 'sonner';
import { IconPicker } from '@repo/ui/components/icon-picker';
import { Space } from '@repo/types/spaces';
import { createSpace } from '@repo/backend/sdk/spaces.js';
interface SpaceDialogProps {
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NewSpaceDialog({ defaultOpen = true, onOpenChange }: SpaceDialogProps) {
  const navigate = useNavigate();
  // Removed parentId from search params as it's not available
  const parentId = null;
  const [open, setOpen] = React.useState(defaultOpen);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState<Omit<Space, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    description: '',
    icon: 'briefcase',
    parentId,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await createSpace({
        name: formData.name,
        icon: formData.icon,
        parent_id: formData.parentId ?? null,
        space_id: null,
      });
      if (error) {
        toast.error(error.message || 'Failed to create space');
      } else {
        toast.success('Space created successfully');
        navigate({ to: '..' });
      }
    } catch (error: any) {
      console.error('Failed to create space:', error);
      toast.error(error.subtitle || 'Failed to create space');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create New Space</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="icon">Space Icon</Label>
              <IconPicker
                value={formData.icon}
                onValueChange={handleIconChange}
                searchable
                triggerPlaceholder="Select an icon"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="My Workspace"
                autoFocus
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description ?? ''}
                onChange={handleInputChange}
                placeholder="Describe the purpose of this space..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name}>
              {isSubmitting ? 'Creating...' : 'Create Space'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
