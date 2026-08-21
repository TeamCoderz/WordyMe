/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useActions, useSelector } from '@/store';
import { Button } from '@repo/ui/components/button';
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
import { THEME_BY_VALUE } from '@repo/ui/theme/themes';
import { cn } from '@repo/ui/lib/utils';
import {
  CircleOff,
  FoldHorizontal,
  Palette,
  RefreshCcw,
  UnfoldHorizontal,
} from '@repo/ui/components/icons';

function InterfacePreferencesSettings() {
  const appSidebar = useSelector((state) => state.ui.appSidebar);
  const documentSidebar = useSelector((state) => state.ui.documentSidebar);
  const folderColorsEnabled = useSelector((state) => state.ui.folderColorsEnabled);
  const folderDefaultColor = useSelector((state) => state.ui.folderDefaultColor);
  const folderColorSolid = useSelector((state) => state.ui.folderColorSolid);
  const {
    setAppSidebar,
    setDocumentSidebar,
    setFolderColorsEnabled,
    setFolderDefaultColor,
    setFolderColorSolid,
  } = useActions();
  const { animations, setAnimations, theme } = useTheme();
  const colorVariants = THEME_BY_VALUE[theme]['color-variants'];
  return (
    <Card id="interface-preferences" className="bg-transparent p-0 overflow-hidden gap-0">
      <CardHeader className="bg-card border-b p-5 block !pb-5">
        <CardTitle className="p-0 text-sm font-semibold">Interface Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="appSidebar">App Sidebar</Label>
            <p className="text-sm text-muted-foreground">Control app sidebar default visibility</p>
          </div>
          <Select
            defaultValue={appSidebar}
            onValueChange={(value) => setAppSidebar(value as 'expanded' | 'collapsed' | 'remember')}
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

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="documentSidebar">Document Sidebar</Label>
            <p className="text-sm text-muted-foreground">
              Control document sidebar default visibility
            </p>
          </div>
          <Select
            value={documentSidebar}
            onValueChange={(value) =>
              setDocumentSidebar(value as 'expanded' | 'collapsed' | 'remember')
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expanded" className="flex items-center gap-2">
                <UnfoldHorizontal className="text-foreground" />
                Expanded
              </SelectItem>
              <SelectItem value="collapsed" className="flex items-center gap-2">
                <FoldHorizontal className="text-foreground" />
                Collapsed
              </SelectItem>
              <SelectItem value="remember" className="flex items-center gap-2">
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

        <Separator className="bg-transparent border-t border-dashed h-0" />

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="folderColors">Colored Folders</Label>
            <p className="text-sm text-muted-foreground">
              Folder icons in the sidebar take a color
            </p>
          </div>
          <Switch
            id="folderColors"
            checked={folderColorsEnabled}
            onCheckedChange={setFolderColorsEnabled}
          />
        </div>

        {folderColorsEnabled && (
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="folderColorSolid">Solid Folder Color</Label>
              <p className="text-sm text-muted-foreground">
                Fill folder icons instead of coloring only the outline - some icons may look chunky
              </p>
            </div>
            <Switch
              id="folderColorSolid"
              checked={folderColorSolid}
              onCheckedChange={setFolderColorSolid}
            />
          </div>
        )}

        {folderColorsEnabled && (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <Label>Default Folder Color</Label>
              <p className="text-sm text-muted-foreground">
                Folders without their own color use this one
              </p>
            </div>
            <div className="flex gap-2 overflow-auto">
              <div className="w-8 h-8">
                <Button
                  variant={'default'}
                  title="Theme"
                  onClick={() => setFolderDefaultColor('theme')}
                  className={cn('flex flex-col items-center gap-1 h-full py-3 w-full relative')}
                >
                  {folderDefaultColor === 'theme' ? <CircleOff /> : <Palette />}
                </Button>
              </div>
              {colorVariants.map((variant) => (
                <div key={variant.value} className={`color-${variant.value} w-8 h-8`}>
                  <Button
                    variant={'default'}
                    title={variant.name}
                    onClick={() => setFolderDefaultColor(variant.value)}
                    className={cn('flex flex-col items-center gap-1 h-full py-3 w-full relative')}
                  >
                    {folderDefaultColor === variant.value && <CircleOff />}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default InterfacePreferencesSettings;
