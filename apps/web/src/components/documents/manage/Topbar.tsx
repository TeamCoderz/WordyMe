/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Button } from '@repo/ui/components/button';
import { FilePlus, FolderPlus, FolderInput } from '@repo/ui/components/icons';

export interface ManageDocumentsTopbarProps {
  onCreateNote: () => void;
  onCreateFolder: () => void;
  onImportDocument: () => void;
}

export function ManageDocumentsTopbar({
  onCreateNote,
  onCreateFolder,
  onImportDocument,
}: ManageDocumentsTopbarProps) {
  return (
    <>
      <div className="px-4 min-h-14 border-b flex items-center justify-between flex-wrap py-1">
        <h2 className="text-lg  font-bold">Manage Documents</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={onCreateNote}
            className="flex items-center gap-2"
          >
            <FilePlus className="h-4 w-4" />
            Create Note
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onCreateFolder}
            className="flex items-center gap-2"
          >
            <FolderPlus className="h-4 w-4" />
            Create Folder
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onImportDocument}
            className="flex items-center gap-2"
          >
            <FolderInput className="h-4 w-4" />
            Import Document
          </Button>
        </div>
      </div>
    </>
  );
}
