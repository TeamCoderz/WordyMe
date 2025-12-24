import { Button } from '@repo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { Menu } from '@repo/ui/components/icons';
import { useChangeAvatarMutation, useDeleteAvatarMutation } from '@/queries/profile';
import { alert } from '@/components/Layout/alert';
import { useCallback } from 'react';
import ChangeAvatarDialog from './ChangeAvatarDialog';

interface AvatarActionsProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function AvatarActions({ open, setOpen }: AvatarActionsProps) {
  const { isPending: isUploadingAvatar } = useChangeAvatarMutation();
  const { mutate: deleteAvatar, isPending: isDeletingAvatar } = useDeleteAvatarMutation();

  const handleDeleteAvatar = useCallback(() => {
    alert({
      title: 'Delete Avatar',
      description: 'Are you sure you want to delete your avatar? This action cannot be undone.',
      cancelText: 'Cancel',
      confirmText: 'Delete',
      onConfirm: () => {
        deleteAvatar();
      },
      buttonVariant: 'destructive',
    });
  }, [deleteAvatar]);

  return (
    <>
      {/* Desktop Actions */}
      <div className="@2xl/avatar-controls:flex gap-2 items-center hidden">
        <ChangeAvatarDialog open={open} setOpen={setOpen} />
        <Button
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={handleDeleteAvatar}
          disabled={isUploadingAvatar || isDeletingAvatar}
        >
          Delete Avatar
        </Button>
      </div>

      {/* Mobile Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild className="block @2xl/avatar-controls:hidden">
          <Button variant="outline">
            <Menu />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            onSelect={() => setOpen(true)}
            disabled={isUploadingAvatar || isDeletingAvatar}
          >
            Change Avatar
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onClick={handleDeleteAvatar}
            disabled={isUploadingAvatar || isDeletingAvatar}
          >
            Delete Avatar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
