/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components/dialog';
import { RestoreBackupForm } from './RestoreBackupForm';

export const RestoreBackupDialog = ({ children }: { children: ReactNode }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Restore from a backup</DialogTitle>
          <DialogDescription>
            Choose a WordyMe backup file to bring your workspace back.
          </DialogDescription>
        </DialogHeader>
        <RestoreBackupForm inDialog />
      </DialogContent>
    </Dialog>
  );
};
