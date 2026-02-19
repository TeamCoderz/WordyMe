/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useSelector } from '@/store';
import {
  useToggleKeepPreviousRevisionMutation,
  useToggleAutosaveMutation,
} from '@/queries/profile';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/card';
import { Label } from '@repo/ui/components/label';
import { Switch } from '@repo/ui/components/switch';
import { useState } from 'react';

function EditorPreferencesSettings() {
  const editorSettings = useSelector((state) => state.user?.editor_settings);

  const [keepPreviousRevision, setKeepPreviousRevision] = useState(
    editorSettings?.keepPreviousRevision,
  );
  const [autosave, setAutosave] = useState(editorSettings?.autosave);
  const { mutate: toggleKeepPreviousRevision, isPending: isKeepPreviousRevisionPending } =
    useToggleKeepPreviousRevisionMutation();
  const { mutate: toggleAutosave, isPending: isAutosavePending } = useToggleAutosaveMutation();

  return (
    <Card id="editor-preferences" className="bg-transparent p-0 overflow-hidden gap-0">
      <CardHeader className="bg-card border-b p-5 block !pb-5">
        <CardTitle className="p-0 text-sm font-semibold">Editor Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="autosave">Autosave</Label>
            <p className="text-sm text-muted-foreground">Automatically save changes as you type</p>
          </div>
          <Switch
            id="autosave"
            checked={autosave}
            onCheckedChange={(checked) => {
              setAutosave(checked);
              toggleAutosave(checked, {
                onError: () => setAutosave(!checked),
              });
            }}
            disabled={isAutosavePending}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="keepPreviousRevision">Revisions</Label>
            <p className="text-sm text-muted-foreground">Save as new revision by default</p>
          </div>
          <Switch
            id="keepPreviousRevision"
            checked={keepPreviousRevision && !autosave}
            onCheckedChange={(checked) => {
              setKeepPreviousRevision(checked);
              toggleKeepPreviousRevision(checked, {
                onError: () => setKeepPreviousRevision(!checked),
              });
            }}
            disabled={isKeepPreviousRevisionPending || autosave}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default EditorPreferencesSettings;
