import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { DRAG_DROP_PASTE } from '@lexical/rich-text';
import { isMimeType, mediaFileReader } from '@lexical/utils';
import { COMMAND_PRIORITY_LOW, PASTE_COMMAND } from 'lexical';
import { useEffect, useId } from 'react';

import { INSERT_IMAGE_COMMAND } from '@repo/editor/plugins/ImagePlugin';
import { getImageDimensions } from '@repo/editor/utils/nodeUtils';
import { ANNOUNCE_COMMAND } from '@repo/editor/commands';
import { useActions } from '@repo/editor/store';
import { $importNodes } from '@repo/editor/utils/clipboard';
import { renderScore } from '@repo/editor/utils/renderScore';
import { INSERT_SCORE_COMMAND } from '@repo/editor/plugins/ScorePlugin';

export default function DragDropPaste(): null {
  const [editor] = useLexicalComposerContext();
  const { uploadAttachment, getAttachmentSignedUrl, uploadImage, getImageSignedUrl } = useActions();
  const toastId = useId();

  const handlePlainTextFile = async (file: File) => {
    try {
      editor.dispatchCommand(ANNOUNCE_COMMAND, {
        id: toastId,
        type: 'loading',
        message: {
          title: `Importing ${file.name}`,
        },
      });
      const text = await file.text();
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/plain', text);
      editor.dispatchCommand(PASTE_COMMAND, new ClipboardEvent('paste', { clipboardData }));
      editor.dispatchCommand(ANNOUNCE_COMMAND, {
        id: toastId,
        type: 'success',
        message: {
          title: `Imported ${file.name} successfully`,
        },
      });
    } catch (error) {
      console.error('Error importing plain text file:', error);
      editor.dispatchCommand(ANNOUNCE_COMMAND, {
        type: 'error',
        message: {
          title: `Importing ${file.name} failed`,
        },
      });
    }
  };

  const handleWordyFile = async (file: File) => {
    try {
      editor.dispatchCommand(ANNOUNCE_COMMAND, {
        id: toastId,
        type: 'loading',
        message: {
          title: `Importing ${file.name}`,
        },
      });
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.nodes) {
        throw new Error('Invalid .wordy file format');
      }
      editor.update(() => {
        $importNodes({ nodes: data.nodes });
      });
      editor.dispatchCommand(ANNOUNCE_COMMAND, {
        id: toastId,
        type: 'success',
        message: {
          title: `Imported ${file.name} successfully`,
        },
      });
    } catch (error) {
      console.error('Error importing .wordy file:', error);
      editor.dispatchCommand(ANNOUNCE_COMMAND, {
        id: toastId,
        type: 'error',
        message: {
          title: `Importing ${file.name} failed`,
        },
      });
    }
  };

  const dataUrlToFile = (dataUrl: string, filename: string): File => {
    const [header, data] = dataUrl.split(',');
    const mime = header.split(';')[0].split(':')[1];
    const svgText = decodeURIComponent(data);
    return new File([svgText], filename, { type: mime });
  };

  const uploadScore = async (file: File, dataUrl: string) => {
    const { data: attachmentData, error: attachmentError } = await uploadAttachment(file);
    if (attachmentError || !attachmentData) {
      throw new Error('Uploading score failed');
    }
    const attachmentFilename = attachmentData.path.split('/').pop()!;
    const { data: attachmentSignedUrlData, error: attachmentSignedUrlError } =
      await getAttachmentSignedUrl(attachmentFilename);

    if (attachmentSignedUrlError || !attachmentSignedUrlData) {
      throw new Error('Failed to get attachment signed URL');
    }
    // Upload SVG file and get signed URL
    const altText = file.name.replace(/\.mxl$/, '');
    const svgFile = dataUrlToFile(dataUrl, `${altText}.svg`);
    const { data: imageData, error: imageError } = await uploadImage(svgFile);
    if (imageError || !imageData) {
      throw new Error('Uploading image failed');
    }
    const imageFilename = imageData.path.split('/').pop()!;
    const { data: imageSignedUrlData, error: imageSignedUrlError } =
      await getImageSignedUrl(imageFilename);
    if (imageSignedUrlError || !imageSignedUrlData) {
      throw new Error('Failed to get image signed URL');
    }
    return {
      attachmentUrl: `/attatchements/${attachmentFilename}`,
      attachmentSignedUrl: attachmentSignedUrlData.signedUrl,
      src: `/images/${imageFilename}`,
      signedUrl: imageSignedUrlData.signedUrl,
    };
  };

  const handleMxlFile = async (file: File) => {
    editor.dispatchCommand(ANNOUNCE_COMMAND, {
      id: toastId,
      type: 'loading',
      message: {
        title: `Importing ${file.name}`,
      },
    });
    try {
      editor.dispatchCommand(ANNOUNCE_COMMAND, {
        id: toastId,
        type: 'loading',
        message: {
          title: `Rendering ${file.name}`,
        },
      });
      const dataUrl = await renderScore(file);
      const dimensions = await getImageDimensions(dataUrl);
      const payload = await uploadScore(file, dataUrl);
      const altText = file.name.replace(/\.mxl$/, '');
      if (!payload) throw new Error('Uploading image failed');
      editor.dispatchCommand(INSERT_SCORE_COMMAND, {
        id: '',
        style: 'filter:auto',
        showCaption: true,
        altText,
        ...payload,
        ...dimensions,
      });
      editor.dispatchCommand(ANNOUNCE_COMMAND, {
        id: toastId,
        type: 'success',
        message: {
          title: `Imported ${file.name} successfully`,
        },
      });
    } catch (error) {
      console.error('Error importing .mxl file:', error);
      editor.dispatchCommand(ANNOUNCE_COMMAND, {
        id: toastId,
        type: 'error',
        message: {
          title: error instanceof Error ? error.message : `Importing ${file.name} failed`,
        },
      });
    }
  };

  const uploadImageFile = async (file: File) => {
    if (!isMimeType(file, ['image/'])) {
      throw new Error('Unsupported file type');
    }
    const { data, error } = await uploadImage(file);
    if (error || !data) {
      throw new Error(`Uploading ${file.name} failed`);
    }
    const filename = data.path.split('/').pop()!;
    const { data: signedUrlData, error: signedUrlError } = await getImageSignedUrl(filename);
    if (signedUrlError || !signedUrlData) {
      throw new Error(`Failed to get image signed URL`);
    }
    return {
      src: `/images/${filename}`,
      signedUrl: signedUrlData.signedUrl,
    };
  };

  const handleImageFile = async (file: File, dataUrl: string) => {
    try {
      editor.dispatchCommand(ANNOUNCE_COMMAND, {
        id: toastId,
        type: 'loading',
        message: {
          title: `Importing ${file.name}`,
        },
      });
      const payload = await uploadImageFile(file);
      if (!payload) throw new Error('Uploading image failed');
      const dimensions = await getImageDimensions(dataUrl);
      const altText = file.name.replace(/\.[^/.]+$/, '');
      editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
        ...payload,
        showCaption: true,
        altText,
        ...dimensions,
        id: '',
        style: '',
      });
      editor.dispatchCommand(ANNOUNCE_COMMAND, {
        id: toastId,
        type: 'success',
        message: {
          title: `Imported ${file.name} successfully`,
        },
      });
    } catch (error) {
      console.error('Error importing image file:', error);
      editor.dispatchCommand(ANNOUNCE_COMMAND, {
        id: toastId,
        type: 'error',
        message: {
          title: `Importing ${file.name} failed`,
          subtitle: error instanceof Error ? error.message : undefined,
        },
      });
    }
  };

  useEffect(() => {
    return editor.registerCommand(
      DRAG_DROP_PASTE,
      (files) => {
        (async () => {
          // handle .wordy files
          const wordyFiles = Array.from(files).filter((file) => file.name.endsWith('.wordy'));

          if (wordyFiles.length > 0) {
            for (const file of wordyFiles) {
              await handleWordyFile(file);
            }
          }

          // handle .mxl files
          const mxlFiles = Array.from(files).filter((file) => file.name.endsWith('.mxl'));
          if (mxlFiles.length > 0) {
            for (const file of mxlFiles) {
              await handleMxlFile(file);
            }
          }

          // handle plain text files
          const textFiles = Array.from(files).filter((file) => {
            const extension = file.name.toLowerCase().split('.').pop();
            return ['txt', 'md', 'markdown', 'text'].includes(extension || '');
          });

          if (textFiles.length > 0) {
            for (const file of textFiles) {
              await handlePlainTextFile(file);
            }
          }

          // handle image files
          const filesResult = await mediaFileReader(
            files,
            ['image/'].flatMap((x) => x),
          );
          filesResult.forEach(async ({ file, result }) => {
            await handleImageFile(file, result);
          });
        })();
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, toastId]);
  return null;
}
