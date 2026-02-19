/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useSelector } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/card';
import { Input } from '@repo/ui/components/input';

const AccountInformation = () => {
  const user = useSelector((state) => state.user);
  return (
    <Card id="account-information" className="bg-transparent p-0 overflow-hidden gap-0 @container">
      <CardHeader className="bg-card border-b p-5 block !pb-5">
        <CardTitle className="p-0 text-sm font-semibold">Account Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input value={user?.email ?? ''} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input value={user?.name ?? ''} disabled className="bg-muted" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountInformation;
