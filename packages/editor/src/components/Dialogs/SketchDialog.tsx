import { INSERT_SKETCH_COMMAND, InsertSketchPayload } from '@repo/editor/plugins/SketchPlugin';
import { useEffect, useState, memo, useCallback } from 'react';
import { $isSketchNode } from '@repo/editor/nodes/SketchNode';
import type {
  ExcalidrawImperativeAPI,
  DataURL,
  LibraryItems,
  BinaryFiles,
  AppState,
  BinaryFileData,
  LibraryItem,
} from '@excalidraw/excalidraw/types';
import { getImageDimensions } from '@repo/editor/utils/nodeUtils';
import { useTheme } from '@repo/ui/theme/theme-provider';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogHeader,
} from '@repo/ui/components/dialog';
import { Button } from '@repo/ui/components/button';
import { ImageNode } from '@repo/editor/nodes/ImageNode';
import { ALERT_COMMAND, ANNOUNCE_COMMAND } from '@repo/editor/commands';
import {
  ExcalidrawElement,
  ExcalidrawImageElement,
  FileId,
} from '@excalidraw/excalidraw/element/types';
import { ImportedLibraryData } from '@excalidraw/excalidraw/data/types';
import '@excalidraw/excalidraw/index.css';
import { debounce } from '@repo/shared/debounce';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useActions } from '@repo/editor/store';
import { restoreFocus } from '@repo/editor/utils/restoreFocus';
import {
  Excalidraw,
  exportToSvg,
  getNonDeletedElements,
  hashElementsVersion,
  hashString,
  isLinearElement,
  loadSceneOrLibraryFromBlob,
  MIME_TYPES,
} from '@excalidraw/excalidraw';
import { NAVIGATION_BLOCKED_EVENT, setShouldBlockNavigation } from '@repo/shared/navigation';

import { toValidURL } from '@excalidraw/common';
import { parseLibraryTokensFromUrl } from '@excalidraw/excalidraw';
import { useHash } from '@repo/ui/hooks/use-hash';

const getLibraryItemsFromStorage = () => {
  try {
    const libraryItems: LibraryItems = JSON.parse(
      localStorage.getItem('excalidraw-library') as string,
    );

    return libraryItems || [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

const validateLibraryUrl = (
  libraryUrl: string,
  /**
   * @returns `true` if the URL is valid, throws otherwise.
   */
  validator: ((libraryUrl: string) => boolean) | string[] = ['excalidraw.com'],
): true => {
  if (
    typeof validator === 'function'
      ? validator(libraryUrl)
      : validator.some((allowedUrlDef) => {
          const allowedUrl = new URL(`https://${allowedUrlDef.replace(/^https?:\/\//, '')}`);

          const { hostname, pathname } = new URL(libraryUrl);

          return (
            new RegExp(`(^|\\.)${allowedUrl.hostname}$`).test(hostname) &&
            new RegExp(`^${allowedUrl.pathname.replace(/\/+$/, '')}(/+|$)`).test(pathname)
          );
        })
  ) {
    return true;
  }

  throw new Error(`Invalid or disallowed library URL: "${libraryUrl}"`);
};

const importLibraryFromURL = async (excalidrawAPI: ExcalidrawImperativeAPI, libraryUrl: string) => {
  const libraryPromise = async () => {
    libraryUrl = decodeURIComponent(libraryUrl);
    libraryUrl = toValidURL(libraryUrl);
    validateLibraryUrl(libraryUrl);
    const request = await fetch(libraryUrl);
    const blob = await request.blob();
    return blob;
  };

  try {
    await excalidrawAPI.updateLibrary({
      libraryItems: libraryPromise,
      prompt: false,
      merge: true,
      defaultStatus: 'published',
      openLibraryMenu: true,
    });
  } catch (error: any) {
    excalidrawAPI.updateScene({
      appState: {
        errorMessage: error.message,
      },
    });
    throw error;
  }
};

const useHandleLibrary = (excalidrawAPI: ExcalidrawImperativeAPI | null) => {
  const hash = useHash();

  useEffect(() => {
    if (!excalidrawAPI) {
      return;
    }

    window.name = excalidrawAPI.id;

    Promise.resolve(getLibraryItemsFromStorage()).then((libraryItems) => {
      excalidrawAPI.updateLibrary({
        libraryItems,
        merge: true,
      });
    });
  }, [excalidrawAPI]);

  useEffect(() => {
    if (!excalidrawAPI) return;
    const libraryUrlTokens = parseLibraryTokensFromUrl();
    if (!libraryUrlTokens) return;
    const { libraryUrl } = libraryUrlTokens;
    importLibraryFromURL(excalidrawAPI, libraryUrl);
    window.history.replaceState(null, '', location.pathname + location.search);
  }, [excalidrawAPI, hash]);
};

export type ExcalidrawElementFragment = { isDeleted?: boolean };

export const useCallbackRefState = () => {
  const [refValue, setRefValue] = useState<ExcalidrawImperativeAPI | null>(null);
  const refCallback = useCallback(
    (value: ExcalidrawImperativeAPI | null) => setRefValue(value),
    [],
  );
  return [refValue, refCallback] as const;
};

function SketchDialog({ node }: { node: ImageNode | null }) {
  const [editor] = useLexicalComposerContext();
  const [excalidrawAPI, excalidrawAPIRefCallback] = useCallbackRefState();
  const [lastSceneVersion, setLastSceneVersion] = useState(0);
  const { mode } = useTheme();
  const systemMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const resolvedMode = mode === 'system' ? systemMode : mode;

  const { updateEditorStoreState, uploadImage, getImageSignedUrl } = useActions();

  useEffect(() => {
    setShouldBlockNavigation(true);
    return () => {
      setShouldBlockNavigation(false);
    };
  }, []);

  useEffect(() => {
    if (!excalidrawAPI) return;
    loadSceneOrLibrary();
  }, [excalidrawAPI]);

  useHandleLibrary(excalidrawAPI);

  const insertSketch = (payload: InsertSketchPayload) => {
    if (!$isSketchNode(node)) {
      editor.dispatchCommand(INSERT_SKETCH_COMMAND, payload);
    } else editor.update(() => node.update(payload));
  };

  const dataUrlToFile = (dataUrl: string, filename: string): File => {
    const [header, data] = dataUrl.split(',');
    const mime = header.split(';')[0].split(':')[1];
    const svgText = decodeURIComponent(data);
    return new File([svgText], filename, { type: mime });
  };

  const handleSubmit = async () => {
    const elements = excalidrawAPI?.getSceneElements();
    const files = excalidrawAPI?.getFiles();
    if (!elements || !files || !exportToSvg) return;
    const element: SVGElement = await exportToSvg({
      appState: {
        exportEmbedScene: true,
      },
      elements: elements!,
      files: files!,
      exportPadding: !node || $isSketchNode(node) ? 16 : 0,
    });

    const serialized = new XMLSerializer().serializeToString(element);
    const dataUrl = 'data:image/svg+xml,' + encodeURIComponent(serialized);
    const dimensions = await getImageDimensions(dataUrl);
    const showCaption = node?.getShowCaption() ?? true;
    const altText = node?.getAltText() ?? 'sketch';
    const id = node?.getId() ?? '';
    const style = node?.getStyle() ?? 'filter:auto';

    // Upload SVG file and get signed URL
    let payloadSrc = dataUrl;
    let signedUrl: string | undefined = undefined;
    try {
      const file = dataUrlToFile(dataUrl, `${altText}.svg`);
      const { data, error } = await uploadImage(file);
      if (error || !data) {
        throw new Error('Uploading image failed');
      }
      const filename = data.path.split('/').pop()!;
      payloadSrc = `/images/${filename}`;
      const { data: signedUrlData } = await getImageSignedUrl(filename);
      signedUrl = signedUrlData?.signedUrl;
    } catch {
      editor.dispatchCommand(ANNOUNCE_COMMAND, {
        type: 'error',
        message: {
          title: 'Uploading image failed',
          subtitle: 'Please try again later',
        },
      });
    }
    restoreFocus(editor);
    insertSketch({
      src: payloadSrc,
      signedUrl,
      showCaption,
      ...dimensions,
      altText,
      style,
      id,
    });
    clearLocalStorage();
    closeDialog();
  };

  const closeDialog = () => {
    updateEditorStoreState('openDialog', null);
  };

  const handleClose = async () => {
    function discard() {
      clearLocalStorage();
      closeDialog();
    }
    function cancel() {
      closeDialog();
    }
    const unsavedScene = localStorage.getItem('excalidraw');
    if (unsavedScene) {
      const alert = {
        title: 'Discard unsaved changes?',
        description: 'Are you sure you want to discard your unsaved changes?',
        confirmText: 'Discard',
        cancelText: 'Cancel',
        onConfirm: discard,
      };
      editor.dispatchCommand(ALERT_COMMAND, alert);
    } else cancel();
  };

  async function restoreSerializedScene(serialized: string) {
    const scene = JSON.parse(serialized);
    const files = Object.values(scene.files) as BinaryFileData[];
    if (files.length) excalidrawAPI?.addFiles(files);
    const elements = getNonDeletedElements(scene.elements).map((element: ExcalidrawElement) =>
      isLinearElement(element) ? { ...element, lastCommittedPoint: null } : element,
    );
    return excalidrawAPI?.updateScene({
      elements,
      appState: { theme: resolvedMode === 'dark' ? 'dark' : 'light' },
    });
  }

  const loadSceneOrLibrary = async () => {
    const unsavedScene = localStorage.getItem('excalidraw');
    if (unsavedScene) {
      const alert = {
        title: 'Restore unsaved changes?',
        description:
          'You have unsaved changes from a previous session. Do you want to restore them?',
        confirmText: 'Restore',
        cancelText: 'Discard',
        onConfirm: () => restoreSerializedScene(unsavedScene),
        onCancel() {
          clearLocalStorage();
          tryLoadSceneFromNode();
        },
      };
      editor.dispatchCommand(ALERT_COMMAND, alert);
    } else tryLoadSceneFromNode();
  };

  async function tryLoadSceneFromNode() {
    if (!node) return;
    const src = node.getSignedUrl();
    if (!src) return;
    try {
      if ($isSketchNode(node)) {
        const blob = await fetch(src).then((res) => res.blob());
        const contents = await loadSceneOrLibraryFromBlob(blob, null, null);
        if (contents.type === MIME_TYPES.excalidraw) {
          excalidrawAPI?.addFiles(Object.values(contents.data.files));
          setLastSceneVersion(hashElementsVersion(contents.data.elements));
          excalidrawAPI?.updateScene({
            ...(contents.data as any),
            appState: { theme: resolvedMode === 'dark' ? 'dark' : 'light' },
          });
        } else if (contents.type === MIME_TYPES.excalidrawlib) {
          excalidrawAPI?.updateLibrary({
            libraryItems: (contents.data as ImportedLibraryData).libraryItems!,
            openLibraryMenu: true,
          });
        }
      } else {
        convertImagetoSketch(src);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function convertImagetoSketch(src: string) {
    const now = Date.now();
    const dimensions = {
      width: node?.getWidth() ?? 0,
      height: node?.getHeight() ?? 0,
    };
    if (!dimensions.width || !dimensions.height) {
      const size = await getImageDimensions(src);
      dimensions.width = size.width;
      dimensions.height = size.height;
    }
    fetch(src)
      .then((res) => res.blob())
      .then((blob) => {
        const mimeType = blob.type;
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result;
          if (typeof base64data === 'string') {
            const imageElement: ExcalidrawImageElement = {
              type: 'image',
              id: `image-${now}`,
              status: 'saved',
              fileId: now.toString() as FileId,
              version: 2,
              versionNonce: now,
              x: 0,
              y: 0,
              width: dimensions.width,
              height: dimensions.height,
              scale: [1, 1],
              isDeleted: false,
              fillStyle: 'hachure',
              strokeWidth: 1,
              strokeStyle: 'solid',
              roughness: 1,
              opacity: 100,
              groupIds: [],
              strokeColor: '#000000',
              backgroundColor: 'transparent',
              seed: now,
              roundness: null,
              angle: 0,
              frameId: null,
              boundElements: null,
              updated: now,
              locked: false,
              link: null,
            } as any;

            excalidrawAPI?.addFiles([
              {
                id: now.toString() as FileId,
                mimeType: mimeType as any,
                dataURL: base64data as DataURL,
                created: now,
                lastRetrieved: now,
              },
            ]);
            setLastSceneVersion(hashElementsVersion([imageElement]));
            excalidrawAPI?.updateScene({
              elements: [imageElement],
              appState: {
                activeTool: {
                  type: 'freedraw',
                  lastActiveTool: null,
                  customType: null,
                  locked: true,
                },
                currentItemStrokeWidth: 0.5,
                theme: resolvedMode === 'dark' ? 'dark' : 'light',
              },
            });
          }
        };
        reader.readAsDataURL(blob);
      });
  }

  const isUniqueItem = (
    existingLibraryItems: LibraryItems,
    targetLibraryItem: LibraryItem,
    index: number,
  ) => {
    const targetElementsIds = targetLibraryItem.elements.map((element) => element.id);
    const firstIndex = existingLibraryItems.findIndex((item) =>
      item.elements.every((element) => targetElementsIds.includes(element.id)),
    );
    return firstIndex === -1 || index === firstIndex;
  };

  const onLibraryChange = async (newItems: LibraryItems) => {
    try {
      const previousItemsString = localStorage.getItem('excalidraw-library') || '[]';
      const previousItemsHash = hashString(previousItemsString);
      const newItemsString = JSON.stringify(newItems);
      const newItemsHash = hashString(newItemsString);
      if (previousItemsHash === newItemsHash) return;
      if (!newItems.length) {
        return localStorage.removeItem('excalidraw-library');
      }
      const previousItems = JSON.parse(previousItemsString);
      const allItems = [...newItems, ...previousItems];
      const uniqueItems = allItems.filter((item, index) => isUniqueItem(allItems, item, index));
      const uniqueItemsString = JSON.stringify(uniqueItems);
      localStorage.setItem('excalidraw-library', uniqueItemsString);
      if (!excalidrawAPI) return;
      const uniqueItemsHash = hashString(uniqueItemsString);
      if (uniqueItemsHash !== previousItemsHash) {
        excalidrawAPI.updateLibrary({
          libraryItems: uniqueItems,
          prompt: false,
          merge: false,
          defaultStatus: 'published',
          openLibraryMenu: false,
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const saveToLocalStorage = debounce(
    async (elements: readonly ExcalidrawElement[], __appState: AppState, files: BinaryFiles) => {
      if (elements.length === 0) return;
      const scene = { elements, files };
      const sceneVersion = hashElementsVersion(elements);
      if (lastSceneVersion && sceneVersion === lastSceneVersion) return;
      setLastSceneVersion(sceneVersion);
      const serialized = JSON.stringify(scene);
      localStorage.setItem('excalidraw', serialized);
    },
    300,
  );

  const clearLocalStorage = () => {
    localStorage.removeItem('excalidraw');
  };

  useEffect(() => {
    const handleNavigationBlocked = () => {
      handleClose();
    };
    window.addEventListener(NAVIGATION_BLOCKED_EVENT, handleNavigationBlocked);
    return () => {
      window.removeEventListener(NAVIGATION_BLOCKED_EVENT, handleNavigationBlocked);
    };
  }, []);

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        setShouldBlockNavigation(open);
        if (!open) handleClose();
      }}
    >
      <DialogContent
        className="flex flex-col gap-0 w-full max-w-full sm:max-w-full p-0 overflow-hidden absolute inset-0 h-screen !translate-0"
        style={{ animation: 'none', top: scrollY + 'px' }}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleClose();
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{node ? 'Edit Sketch' : 'Insert Sketch'}</DialogTitle>
          <DialogDescription>Draw a sketch in the editor.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <Excalidraw
            excalidrawAPI={excalidrawAPIRefCallback}
            theme={resolvedMode === 'dark' ? 'dark' : 'light'}
            onLibraryChange={onLibraryChange}
            onChange={saveToLocalStorage}
            langCode="en"
          />
        </div>
        <DialogFooter className="m-0">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>{!node ? 'Insert' : 'Update'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default memo(SketchDialog);
