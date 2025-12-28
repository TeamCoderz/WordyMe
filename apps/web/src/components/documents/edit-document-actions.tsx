import { DropDown } from '@repo/editor/components/dropdown';
import {
  SaveIcon,
  PrinterIcon,
  CheckCheckIcon,
  Loader2Icon,
  FileOutputIcon,
  EyeIcon,
} from '@repo/ui/components/icons';
import { cn } from '@repo/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import {
  getDocumentByHandleQueryOptions,
  useUpdateDocumentHeadMutation,
  useExportDocumentMutation,
} from '@/queries/documents';
import { getRevisionsByDocumentIdQueryOptions, useSaveDocumentMutation } from '@/queries/revisions';
import { useEffect, useMemo, useState } from 'react';
import { useComposerContext } from '@repo/editor/hooks/useComposerContext';
import { Link } from '@tanstack/react-router';
import { Button } from '@repo/ui/components/button';
import { useDebouncedCallback } from 'use-debounce';
import { useSelector as useEditorSelector } from '@repo/editor/store';
import { useSelector } from '@/store';
import { computeChecksum } from '@repo/editor/utils/computeChecksum';
import { Portal } from '@repo/ui/components/portal';
import { SidebarTrigger } from '@repo/ui/components/sidebar';
import { serializeEditorState } from '@repo/editor/utils/editorState';

export function EditDocumentActions({ handle }: { handle: string }) {
  const [editor] = useComposerContext();
  const { data: document } = useQuery(getDocumentByHandleQueryOptions(handle));
  const docId = document?.id ?? '';
  const { data: revisions } = useQuery(getRevisionsByDocumentIdQueryOptions(docId));
  const checksum = useEditorSelector((state) => state.checksum);
  const cloudRevision = useMemo(
    () => revisions?.find((r) => r.checksum === checksum),
    [revisions, checksum],
  );
  const isPreviouslySaved = !!cloudRevision;
  const isUpToDate = isPreviouslySaved && document?.head === cloudRevision.id;

  const isLoading =
    !document ||
    !checksum ||
    !revisions?.length ||
    (isPreviouslySaved && cloudRevision.documentId !== document.id);
  const [isSaving, setIsSaving] = useState(false);
  const [isJustSaved, setIsJustSaved] = useState(false);
  const isDisabled = isLoading || isSaving || isJustSaved || isUpToDate;

  const { mutateAsync: updateDocumentHead } = useUpdateDocumentHeadMutation({
    doc: document ?? null,
  });

  const editorSettings = useSelector((state) => state.user?.editor_settings);
  const { mutateAsync: saveDocument } = useSaveDocumentMutation({
    documentId: docId,
    documentHandle: handle,
  });
  const exportDocumentMutation = useExportDocumentMutation(docId, document?.name);

  const handleSaveSuccess = () => {
    setIsSaving(false);
    setIsJustSaved(true);
    setTimeout(() => {
      setIsJustSaved(false);
    }, 1000);
  };
  const handleUpdate = async (isAutosave: boolean = false) => {
    if (isSaving || isUpToDate) return;
    setIsSaving(true);
    try {
      if (isPreviouslySaved) {
        await updateDocumentHead({
          id: docId,
          head: cloudRevision.id,
        });
      } else {
        const editorState = editor.getEditorState();
        const serializedEditorState = serializeEditorState(editorState);
        const checksum = computeChecksum(serializedEditorState);
        await saveDocument({
          document: document!,
          editorState,
          checksum,
          keepPreviousRevision: editorSettings?.keep_previous_revision && !editorSettings?.autosave,
          isAutosave,
        });
      }
      handleSaveSuccess();
    } catch (error) {
      setIsSaving(false);
    }
  };
  const handleDebouncedUpdate = useDebouncedCallback(handleUpdate, 3000);

  const handleSaveAsNewRevision = async () => {
    setIsSaving(true);
    try {
      const editorState = editor.getEditorState();
      const serializedEditorState = serializeEditorState(editorState);
      const checksum = computeChecksum(serializedEditorState);
      await saveDocument({
        document: document!,
        editorState,
        checksum,
        keepPreviousRevision: true,
      });
      handleSaveSuccess();
    } catch (error) {
      setIsSaving(false);
    }
  };

  const handleSaveAndOverwrite = async () => {
    setIsSaving(true);
    try {
      const editorState = editor.getEditorState();
      const serializedEditorState = serializeEditorState(editorState);
      const checksum = computeChecksum(serializedEditorState);
      await saveDocument({
        document: document!,
        editorState,
        checksum,
        keepPreviousRevision: false,
      });
      handleSaveSuccess();
    } catch (error) {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (editorSettings?.autosave) {
      handleDebouncedUpdate(true);
    }
  }, [checksum]);

  return (
    <Portal container="#app-toolbar">
      <>
        <div className="flex items-center gap-2">
          <DropDown
            variant="split"
            label={
              <>
                {isSaving ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <CheckCheckIcon
                    className={cn({
                      '!text-muted-foreground': isDisabled || !isPreviouslySaved,
                      'dark:!text-muted': !isDisabled && !isPreviouslySaved,
                      '!text-green-500': isJustSaved,
                    })}
                  />
                )}
                <span
                  className={cn('max-sm:sr-only sm:w-10 text-start', {
                    '!text-muted-foreground': isDisabled,
                  })}
                >
                  {isJustSaved ? 'Saved' : 'Save'}
                </span>
              </>
            }
            labelProps={{
              className: cn({
                '!bg-input': isDisabled,
                '!bg-green-100 dark:!text-input': isJustSaved,
                '!bg-yellow-100/70 dark:!text-input':
                  !isLoading && !isJustSaved && !isPreviouslySaved,
              }),
              onClick: () => handleUpdate(false),
              disabled: isDisabled,
            }}
            options={[
              ...[
                editorSettings?.keep_previous_revision && !editorSettings?.autosave
                  ? {
                      label: 'Save and overwrite',
                      value: 'saveAndOverwrite',
                      icon: <SaveIcon />,
                      func: handleSaveAndOverwrite,
                      disabled: isDisabled || isPreviouslySaved,
                    }
                  : {
                      label: 'Save as new revision',
                      value: 'saveAsNewRevision',
                      icon: <SaveIcon />,
                      func: handleSaveAsNewRevision,
                      disabled: isDisabled || isPreviouslySaved,
                    },
              ],
            ]}
            value="save"
          />
          <Button variant="outline" className="size-9 p-0! md:w-auto md:px-3! font-normal" asChild>
            <Link to="/view/$handle" params={{ handle: document?.handle ?? document?.id ?? '' }}>
              <EyeIcon />
              <span className="max-md:sr-only text-start">View</span>
            </Link>
          </Button>

          <Button
            variant="outline"
            className="size-9 p-0! md:w-auto md:px-3! font-normal"
            onClick={() => exportDocumentMutation.mutate()}
          >
            <FileOutputIcon />
            <span className="max-md:sr-only text-start">Export</span>
          </Button>
          <Button
            variant="outline"
            className="size-9 p-0! md:w-auto md:px-3! font-normal"
            onClick={() => window.print()}
          >
            <PrinterIcon />
            <span className="max-md:sr-only text-start">Print</span>
          </Button>
        </div>
        <SidebarTrigger variant="outline" className="size-9 !p-2 [&>svg]:rotate-180 md:hidden" />
      </>
    </Portal>
  );
}

export default EditDocumentActions;
