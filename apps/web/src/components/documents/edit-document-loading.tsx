/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Skeleton } from '@repo/ui/components/skeleton';
import { EditorComposer } from '@repo/editor/EditorComposer';
import ToolbarPlugin from '@repo/editor/plugins/ToolbarPlugin';
import { DocumentSidebar } from './document-sidebar';

export function EditDocumentLoading({ handle }: { handle: string }) {
  return (
    <EditorComposer initialState={null} editable={false}>
      <DocumentSidebar handle={handle}>
        <div className="editor-container flex flex-col w-0 flex-1 h-full relative">
          <ToolbarPlugin />
          <div className="p-6 @md:p-8 w-full flex-1 self-stretch">
            <Skeleton className="h-8 w-1/4 mt-5 mb-6" />
            <Skeleton className="h-5 w-full mb-3" />
            <Skeleton className="h-5 w-11/12 mb-3" />
            <Skeleton className="h-5 w-10/12 mb-3" />
            <Skeleton className="h-5 w-9/12 mb-6" />
            <Skeleton className="h-6 w-1/3 mb-4" />
            <Skeleton className="h-5 w-full mb-3" />
            <Skeleton className="h-5 w-10/12 mb-3" />
            <Skeleton className="h-5 w-9/12 mb-3" />
          </div>
        </div>
      </DocumentSidebar>
    </EditorComposer>
  );
}
