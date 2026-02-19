/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebouncedCallback } from 'use-debounce';
import { computeChecksum } from '@repo/editor/utils/computeChecksum';
import {
  getDocumentByHandleQueryOptions,
  useUpdateDocumentHeadMutation,
  useExportDocumentMutation,
} from '@/queries/documents';
import {
  getRevisionsByDocumentIdQueryOptions,
  getLocalRevisionByDocumentIdQueryOptions,
  useSaveDocumentMutation,
  getRevisionByIdQueryOptions,
  useSaveLocalRevisionMutation,
} from '@/queries/revisions';
import { useActions, useSelector } from '@/store';
import { useNavigate } from '@tanstack/react-router';

export function useDocumentActions(handle: string | null) {
  const queryClient = useQueryClient();
  const tabId = useSelector(
    (state) => state.tabs.tabs.find((tab) => tab.pathname.split('/').pop() === handle)?.id,
  );
  const activeTabId = useSelector((state) => state.tabs.activeTabId);
  const isActiveRef = useRef(activeTabId === tabId);

  // Queries
  const documentQueryOptions = getDocumentByHandleQueryOptions(handle ?? '');
  const { data: document } = useQuery({
    ...documentQueryOptions,
    enabled: !!handle,
  });

  const docId = document?.id ?? '';

  const revisionsQueryOptions = getRevisionsByDocumentIdQueryOptions(docId);
  const { data: revisions } = useQuery({
    ...revisionsQueryOptions,
    enabled: !!docId,
  });

  const [checksum, setChecksum] = useState<string | null>(null);
  const cloudRevision = useMemo(
    () => revisions?.find((r) => r.checksum === checksum),
    [revisions, checksum],
  );

  const isPreviouslySaved = !!cloudRevision;
  const isUpToDate = isPreviouslySaved && document?.currentRevisionId === cloudRevision.id;

  const isLoading =
    !document ||
    !checksum ||
    !revisions?.length ||
    (isPreviouslySaved && cloudRevision.documentId !== document.id);

  const [isSaving, setIsSaving] = useState(false);
  const [isJustSaved, setIsJustSaved] = useState(false);
  const isDisabled = isLoading || isSaving || isJustSaved || isUpToDate;

  const documentTab = useSelector((state) =>
    state.tabs.tabs.find((tab) => tab.pathname.split('/').pop() === handle),
  );
  const isViewTab = documentTab?.pathname.startsWith('/view/');
  const { setTabDirty } = useActions();

  const { mutateAsync: updateDocumentHead } = useUpdateDocumentHeadMutation({
    doc: document ?? null,
  });

  const editorSettings = useSelector((state) => state.user?.editor_settings);

  const { mutateAsync: saveDocument } = useSaveDocumentMutation({
    documentId: docId,
    documentHandle: handle ?? '',
  });

  const { mutateAsync: saveLocalRevision } = useSaveLocalRevisionMutation({
    documentId: document?.id ?? '',
  });

  const exportDocumentMutation = useExportDocumentMutation(docId, document?.name);

  const navigate = useNavigate();

  const handleSaveSuccess = async () => {
    if (documentTab) {
      setTabDirty(documentTab.id, false);
    }
    setIsSaving(false);
    setIsJustSaved(true);
    setTimeout(() => {
      setIsJustSaved(false);
    }, 1000);
  };

  const handleUpdate = async (isAutosave: boolean = false) => {
    if (isSaving || isUpToDate || !document || !handle) return;
    setIsSaving(true);
    try {
      if (isPreviouslySaved && cloudRevision) {
        await updateDocumentHead({
          id: docId,
          head: cloudRevision.id,
        });
        setChecksum(cloudRevision.checksum);
        if (isViewTab) {
          const revision = await queryClient.ensureQueryData(
            getRevisionByIdQueryOptions(cloudRevision.id, true),
          );
          queryClient.setQueryData(
            getLocalRevisionByDocumentIdQueryOptions(document?.id ?? '').queryKey,
            { data: JSON.parse(revision?.content) },
          );
          await saveLocalRevision({ serializedEditorState: JSON.parse(revision?.content) });
          if (isActiveRef.current)
            navigate({
              to: '/view/$handle',
              params: { handle: document?.handle ?? '' },
              search: (prev) => ({
                ...prev,
                v: undefined,
              }),
            });
        }
      } else {
        const serializedEditorState = await queryClient
          .ensureQueryData(
            getLocalRevisionByDocumentIdQueryOptions(document.id, document.currentRevisionId, true),
          )
          .then((revision) =>
            revision && 'content' in revision ? JSON.parse(revision.content) : null,
          );

        const newChecksum = computeChecksum(serializedEditorState);
        await saveDocument({
          document,
          serializedEditorState,
          checksum: newChecksum,
          keepPreviousRevision: editorSettings?.keepPreviousRevision && !editorSettings?.autosave,
          isAutosave,
        });
        setChecksum(newChecksum);
      }
      handleSaveSuccess();
    } catch {
      setIsSaving(false);
    }
  };

  const handleDebouncedUpdate = useDebouncedCallback(handleUpdate, 3000);

  const handleSaveAsNewRevision = async () => {
    if (!document || !handle) return;
    setIsSaving(true);
    try {
      const serializedEditorState = await queryClient
        .ensureQueryData(
          getLocalRevisionByDocumentIdQueryOptions(document.id, document.currentRevisionId, true),
        )
        .then((revision) =>
          revision && 'content' in revision ? JSON.parse(revision.content) : null,
        );
      const newChecksum = computeChecksum(serializedEditorState);
      await saveDocument({
        document,
        serializedEditorState,
        checksum: newChecksum,
        keepPreviousRevision: true,
      });
      setChecksum(newChecksum);
      handleSaveSuccess();
    } catch {
      setIsSaving(false);
    }
  };

  const handleSaveAndOverwrite = async () => {
    if (!document || !handle) return;
    setIsSaving(true);
    try {
      const serializedEditorState = await queryClient
        .ensureQueryData(
          getLocalRevisionByDocumentIdQueryOptions(document.id, document.currentRevisionId, true),
        )
        .then((revision) =>
          revision && 'content' in revision ? JSON.parse(revision.content) : null,
        );
      const newChecksum = computeChecksum(serializedEditorState);
      await saveDocument({
        document,
        serializedEditorState,
        checksum: newChecksum,
        keepPreviousRevision: false,
      });
      setChecksum(newChecksum);
      handleSaveSuccess();
    } catch {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const isActive = activeTabId === tabId;
    isActiveRef.current = isActive;
  }, [activeTabId, tabId]);

  useEffect(() => {
    const handleChecksumChange = (event: Event) => {
      if (!isActiveRef.current) return;
      const customEvent = event as CustomEvent<{ checksum: string }>;
      if (customEvent.detail?.checksum) {
        setChecksum(customEvent.detail.checksum);
      }
    };

    window.addEventListener('checksum-change', handleChecksumChange);
    return () => {
      window.removeEventListener('checksum-change', handleChecksumChange);
    };
  }, []);

  useEffect(() => {
    if (editorSettings?.autosave && handle) {
      handleDebouncedUpdate(true);
    }
  }, [checksum, editorSettings?.autosave, handle, handleDebouncedUpdate]);

  useEffect(() => {
    if (isLoading) return;
    if (documentTab) {
      setTabDirty(documentTab.id, !isUpToDate);
    }
  }, [isLoading, isUpToDate, setTabDirty]);

  const backgroundClassName = (() => {
    if (!handle) return undefined;
    if (isJustSaved) {
      return 'bg-green-100/80 dark:bg-green-900/40';
    }
    if (!isLoading && !isUpToDate) {
      // Document has unsaved changes
      return 'bg-yellow-100/70 dark:bg-yellow-900/30';
    }
    return undefined;
  })();

  return {
    isLoading,
    isSaving,
    isJustSaved,
    isPreviouslySaved,
    isUpToDate,
    isDisabled,
    handleUpdate,
    handleSaveAsNewRevision,
    handleSaveAndOverwrite,
    handleExport: () => exportDocumentMutation.mutate(),
    handlePrint: () => window.print(),
    editorSettings,
    backgroundClassName,
  };
}
