/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useMemo, useState } from 'react';
import { Download, FileQuestion, AlertCircle } from '@repo/ui/components/icons';
import { Button } from '@repo/ui/components/button';
import { cn } from '@repo/ui/lib/utils';
import { PDFViewer } from '@repo/embed-pdf/viewer';

type MediaType = 'image' | 'video' | 'audio' | 'pdf' | 'unknown';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm'];
const PDF_EXTENSIONS = ['pdf'];

function getMediaTypeFromFilename(filename: string): MediaType {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
  if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';
  if (PDF_EXTENSIONS.includes(ext)) return 'pdf';
  return 'unknown';
}

function getMediaTypeFromMime(mime: string | null): MediaType | null {
  if (!mime) return null;
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf') return 'pdf';
  return null;
}

interface AttachmentViewerProps {
  url: string;
  name?: string;
  mimeType?: string | null;
  className?: string;
}

export function AttachmentViewer({
  url,
  name = 'attachment',
  mimeType,
  className,
}: AttachmentViewerProps) {
  const [error, setError] = useState<string | null>(null);

  const mediaType = useMemo((): MediaType => {
    const fromMime = getMediaTypeFromMime(mimeType ?? null);
    if (fromMime) return fromMime;
    return getMediaTypeFromFilename(name);
  }, [name, mimeType]);

  const handleError = () => {
    setError('Failed to load attachment');
  };

  const handleLoad = () => {
    setError(null);
  };

  if (error) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-4 p-8 min-h-[200px]',
          className,
        )}
      >
        <AlertCircle className="size-12 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" asChild>
          <a href={url} download={name} target="_blank" rel="noopener noreferrer">
            <Download className="size-4 mr-2" />
            Download
          </a>
        </Button>
      </div>
    );
  }

  switch (mediaType) {
    case 'image':
      return (
        <div className={cn('flex items-center justify-center p-4', className)}>
          {' '}
          <img
            src={url}
            alt={name}
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
            onError={handleError}
            onLoad={handleLoad}
          />
        </div>
      );

    case 'video':
      return (
        <div className={cn('flex flex-col items-center gap-4 p-4', className)}>
          <video
            src={url}
            controls
            className="max-w-full max-h-[85vh] rounded-lg"
            onError={handleError}
            onLoadedData={handleLoad}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );

    case 'audio':
      return (
        <div className={cn('flex flex-col items-center gap-4 p-8', className)}>
          <audio
            src={url}
            controls
            className="w-full max-w-md"
            onError={handleError}
            onLoadedData={handleLoad}
          >
            Your browser does not support the audio tag.
          </audio>
        </div>
      );

    case 'pdf':
      return (
        <div className={cn('flex flex-col h-full', className)}>
          <PDFViewer url={url} />
        </div>
      );

    default:
      return (
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-4 p-8 min-h-[200px]',
            className,
          )}
        >
          <FileQuestion className="size-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            Preview not available for this file type.
          </p>
          <p className="text-xs text-muted-foreground">{name}</p>
          <Button variant="outline" asChild>
            <a href={url} download={name} target="_blank" rel="noopener noreferrer">
              <Download className="size-4 mr-2" />
              Download
            </a>
          </Button>
        </div>
      );
  }
}
