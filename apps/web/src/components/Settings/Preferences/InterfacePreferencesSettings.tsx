/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useActions, useSelector } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/card';
import { Label } from '@repo/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import { Separator } from '@repo/ui/components/separator';
import { Switch } from '@repo/ui/components/switch';
import { useTheme } from '@repo/ui/theme/theme-provider';
import { FoldHorizontal, RefreshCcw, UnfoldHorizontal } from '@repo/ui/components/icons';

function InterfacePreferencesSettings() {
  const sidebar = useSelector((state) => state.sidebar);
  const { setSidebar } = useActions();
  const { animations, setAnimations } = useTheme();
  return (
    <Card id="interface-preferences" className="bg-transparent p-0 overflow-hidden gap-0">
      <CardHeader className="bg-card border-b p-5 block !pb-5">
        <CardTitle className="p-0 text-sm font-semibold">Interface Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="sidebar">Sidebar</Label>
            <p className="text-sm text-muted-foreground">Control sidebar default visibility</p>
          </div>
          <Select
            defaultValue={sidebar}
            onValueChange={(value) => setSidebar(value as 'expanded' | 'collapsed' | 'remember')}
          >
            <SelectTrigger className="">
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expanded" className=" flex items-center gap-2">
                <UnfoldHorizontal className="text-foreground" />
                Expanded
              </SelectItem>
              <SelectItem value="collapsed" className=" flex items-center gap-2">
                <FoldHorizontal className="text-foreground" />
                Collapsed
              </SelectItem>
              <SelectItem value="remember" className=" flex items-center gap-2">
                <RefreshCcw className="text-foreground" />
                Remember Last State
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator className="bg-transparent border-t border-dashed h-0" />

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="animations">Animations</Label>
            <p className="text-sm text-muted-foreground">Toggle interface animations</p>
          </div>
          <Switch
            id="animations"
            defaultChecked={animations === 'on'}
            onCheckedChange={(checked) => setAnimations(checked ? 'on' : 'off')}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default InterfacePreferencesSettings;
