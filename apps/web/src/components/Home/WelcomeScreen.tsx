/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { createDocumentWithRevision } from '@repo/sdk/documents.ts';
import { getInitialEditorState } from '@repo/editor/utils/getInitialEditorState';
import { computeChecksum } from '@repo/editor/utils/computeChecksum';
import { createLocalDocument } from '@repo/editor/indexeddb';
import { ArrowRight, DatabaseBackup, FilePlus2, Loader2 } from '@repo/ui/components/icons';
import { toast } from 'sonner';
import { useSelector } from '@/store';
import { RestoreBackupDialog } from '@/components/Settings/Backup/RestoreBackupDialog';

const cardClass =
  'group relative flex w-full flex-col items-start gap-4 rounded-xl border bg-card p-5 text-left transition-all hover:border-foreground/20 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60';

const iconClass =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground transition-colors group-hover:bg-foreground group-hover:text-background';

const arrowClass =
  'h-4 w-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-60';

export const WelcomeScreen = ({ userName }: { userName: string }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const activeSpace = useSelector((state) => state.wordy.activeSpace[state.tabs.activePane]);
  const [creating, setCreating] = useState(false);

  const createFirstDocument = async () => {
    if (creating) return;
    setCreating(true);

    const name = 'New Document';
    const serializedEditorState = getInitialEditorState(name);

    const { data, error } = await createDocumentWithRevision({
      name,
      icon: 'file',
      documentType: 'note',
      spaceId: activeSpace?.id ?? null,
      parentId: null,
      position: 'a0',
      isContainer: false,
      clientId: uuidv4(),
      revision: {
        content: JSON.stringify(serializedEditorState),
        checksum: computeChecksum(serializedEditorState),
        text: name,
        makeCurrentRevision: true,
      },
    });

    if (error || !data) {
      setCreating(false);
      toast.error(error?.message ?? 'Could not create the document.');
      return;
    }

    await createLocalDocument(data.id, data.name);
    await queryClient.invalidateQueries();
    void navigate({ to: '/edit/$handle', params: { handle: data.handle } });
  };

  return (
    <main className="h-full w-full px-6 py-16 flex items-start justify-center">
      <div className="w-full max-w-3xl space-y-10">
        <header className="space-y-2 text-center">
          <h1 className="text-xl @md:text-2xl font-semibold tracking-tight">
            Let&apos;s get started, {userName}!🌥️
          </h1>
          <p className="text-muted-foreground">
            This workspace is empty. Start a new document, or bring everything back from a backup.
          </p>
        </header>

        <div className="grid gap-4 @2xl:grid-cols-2">
          <button
            type="button"
            onClick={() => void createFirstDocument()}
            disabled={creating}
            className={cardClass}
          >
            <span className={iconClass}>
              {creating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <FilePlus2 className="h-5 w-5" />
              )}
            </span>
            <span className="space-y-1.5">
              <span className="flex items-center gap-1.5 font-medium">
                {creating ? 'Creating…' : 'Create your first document'}
                <ArrowRight className={arrowClass} />
              </span>
              <span className="block text-sm text-muted-foreground">
                Opens a blank note in {activeSpace?.name ?? 'your workspace'} so you can start
                writing straight away.
              </span>
            </span>
          </button>

          <RestoreBackupDialog>
            <button type="button" className={cardClass}>
              <span className={iconClass}>
                <DatabaseBackup className="h-5 w-5" />
              </span>
              <span className="space-y-1.5">
                <span className="flex items-center gap-1.5 font-medium">
                  Restore from a WordyMe backup
                  <ArrowRight className={arrowClass} />
                </span>
                <span className="block text-sm text-muted-foreground">
                  Rebuilds your spaces, documents, revisions and attachments from a backup file.
                </span>
              </span>
            </button>
          </RestoreBackupDialog>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          You can also right-click in the sidebar to add a document, or use the workspace switcher
          above it to add a space.
        </p>
      </div>
    </main>
  );
};
