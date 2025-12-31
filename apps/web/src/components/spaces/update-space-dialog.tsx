import * as React from 'react';
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
import { toast } from 'sonner';
import { IconPicker } from '@repo/ui/components/icon-picker';
import { Space } from '@repo/types/spaces';
import { updateSpace } from '@repo/backend/sdk/spaces.js';

interface UpdateSpaceDialogProps {
  space: Space;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpdateSpaceDialog({ space, open, onOpenChange }: UpdateSpaceDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState<Pick<Space, 'name' | 'icon' | 'parentId'>>({
    name: space.name,
    icon: space.icon,
    parentId: space.parentId ?? null,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleIconChange = (icon: string) => {
    setFormData((prev) => ({ ...prev, icon }));
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await updateSpace(space.id, {
        name: formData.name,
        icon: formData.icon,
        parent_id: formData.parentId ?? undefined,
      });
      if (error) {
        toast.error(error.message || 'Failed to update space');
      } else {
        toast.success('Space updated successfully');
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Space</DialogTitle>
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

            {/* Description field removed: backend update payload does not support it */}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name}>
              {isSubmitting ? 'Updating...' : 'Update Space'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
