/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Dialog, DialogContent } from '@repo/ui/components/dialog';
import { useState } from 'react';
import { useSelector } from '@/store';
import AvatarDisplay from './AvatarDisplay';
import UserInfo from './UserInfo';
import AvatarActions from './AvatarActions';
import AvatarCropper from './AvatarCropper';

export default function AvatarControls() {
  const user = useSelector((state) => state.user);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="@container/avatar-controls">
      <div className="flex items-center gap-6 -mt-6 px-8 max-w-7xl mx-auto relative z-10">
        <AvatarDisplay onEdit={() => setEditOpen(true)} />

        <div className="flex items-center justify-between flex-1">
          <UserInfo />
          <AvatarActions open={open} setOpen={setOpen} />
        </div>

        {/* Edit Avatar Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <AvatarCropper
              image={
                `${import.meta.env.VITE_BACKEND_URL ?? ''}/${user?.avatar_image?.url ?? ''}` || null
              }
              isNewUpload={false}
              onClose={() => setEditOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
