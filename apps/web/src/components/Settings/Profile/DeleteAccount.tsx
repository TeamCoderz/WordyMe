/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { alert } from '@/components/Layout/alert';
import { Alert, AlertDescription } from '@repo/ui/components/alert';
import { Button } from '@repo/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/card';
import { useDeleteProfileMutation } from '@/queries/profile';
import { Loader2 } from '@repo/ui/components/icons';

function DeleteAccount() {
  const { mutate, isPending } = useDeleteProfileMutation();
  return (
    <Card id="danger-zone" className="bg-transparent p-0 overflow-hidden gap-0 @container">
      <CardHeader className="bg-card border-b p-5 block !pb-5">
        <CardTitle className="p-0 text-sm font-semibold">Danger Zone</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-6">
        <Alert className="bg-destructive/10 " variant="destructive">
          <AlertDescription>
            Warning! Deleting your account will remove all of your content and data. this action
            cannot be undone.
            <Button
              className="mt-5"
              disabled={isPending}
              onClick={() => {
                alert({
                  title: 'Delete Account',
                  description:
                    'Are you sure you want to delete your account? This action cannot be undone.',
                  cancelText: 'Cancel',
                  confirmText: 'Delete',
                  onConfirm: () => {
                    mutate();
                  },
                  buttonVariant: 'destructive',
                });
              }}
              variant="destructive"
            >
              {isPending ? (
                <>
                  <Loader2 className="!animate-spin" /> Deleting...
                </>
              ) : (
                'Delete Account'
              )}
            </Button>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

export default DeleteAccount;
