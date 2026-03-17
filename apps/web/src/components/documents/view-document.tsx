/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { ImageZoom } from './image-zoom';
import { useRef } from 'react';
import type { LexicalEditor } from '@repo/editor/types';
import { EditorComposer } from '@repo/editor/EditorComposer';
import { useServices } from './useServices';
import { Viewer } from '@repo/editor/Viewer';
import { DocumentSidebar } from './document-sidebar';

interface ViewDocumentProps {
  userId: string;
  documentId: string;
  documentHandle: string;
  revisionId?: string;
  initialState?: string;
  tabId?: string;
}

export function ViewDocument({
  userId,
  documentId,
  documentHandle,
  revisionId,
  initialState,
  tabId,
}: ViewDocumentProps) {
  const editorRef = useRef<LexicalEditor>(null);
  const services = useServices(documentId, userId);

  return (
    <EditorComposer
      key={revisionId ?? documentId}
      initialState={initialState ?? null}
      editable={false}
      services={services}
      editorRef={editorRef}
    >
      <DocumentSidebar handle={documentHandle}>
        <ImageZoom />
        <Viewer documentId={documentId} tabId={tabId} />
      </DocumentSidebar>
    </EditorComposer>
  );
}
