/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  FileArchiveIcon,
  FileAudioIcon,
  FileCodeIcon,
  FileCogIcon,
  FileIcon,
  FileTextIcon,
  FileVideoIcon,
  DownloadIcon,
  EyeIcon,
} from '@repo/ui/components/icons';
import { NodeKey } from 'lexical';
import { cn } from '@repo/ui/lib/utils';
import { Button } from '@repo/ui/components/button';

const VIEWABLE_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'bmp',
  'ico',
  'mp4',
  'webm',
  'ogg',
  'mov',
  'avi',
  'mkv',
  'mp3',
  'wav',
  'm4a',
  'aac',
  'flac',
  'pdf',
];

function isViewable(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return VIEWABLE_EXTENSIONS.includes(ext);
}

type AttachmentComponentProps = {
  nodeKey: NodeKey;
  name: string;
  size: number;
  url: string;
  signedUrl?: string;
};

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${sizes[i]}`;
}

function getFileIcon(name: string, mime?: string) {
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  const type = mime ?? '';

  if (type.startsWith('video/') || ['mp4', 'mov', 'webm', 'mkv'].includes(extension)) {
    return <FileVideoIcon />;
  }
  if (type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) {
    return <FileAudioIcon />;
  }
  if (type.startsWith('text/') || ['txt', 'md', 'rtf', 'pdf'].includes(extension)) {
    return <FileTextIcon />;
  }
  if (
    [
      'html',
      'css',
      'js',
      'jsx',
      'ts',
      'tsx',
      'json',
      'xml',
      'php',
      'py',
      'rb',
      'java',
      'c',
      'cpp',
      'cs',
    ].includes(extension)
  ) {
    return <FileCodeIcon />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(extension)) {
    return <FileArchiveIcon />;
  }
  if (
    ['exe', 'msi', 'app', 'apk', 'deb', 'rpm'].includes(extension) ||
    type.startsWith('application/')
  ) {
    return <FileCogIcon />;
  }
  return <FileIcon />;
}

export const AttachmentCard = (
  props: Omit<AttachmentComponentProps, 'nodeKey'> & React.HTMLAttributes<HTMLDivElement>,
) => {
  const { name, size, url, signedUrl, className, ...rest } = props;
  const href = signedUrl ?? url;
  const canView = href && href !== '#' && isViewable(name);

  const handleDownload = async () => {
    try {
      const res = await fetch(href);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(href, '_blank');
    }
  };

  return (
    <div
      className={cn(
        'relative flex items-center gap-2.5 rounded-md border p-3 bg-background text-foreground select-none',
        className,
      )}
      {...rest}
    >
      <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded [&>svg]:size-10">
        {getFileIcon(name)}
      </div>

      <div className="flex min-w-0 flex-1 flex-col w-40">
        <span className="truncate font-medium text-sm" title={name}>
          {name}
        </span>
        <span className="truncate text-muted-foreground text-xs">{formatBytes(size)}</span>
      </div>

      <div className="flex items-center gap-1.5">
        {canView ? (
          <Button
            variant="outline"
            className="bg-transparent"
            size="icon"
            disabled={!canView}
            aria-label={`View ${name}`}
            title="View"
            asChild
          >
            <a
              href={`/attachment?${new URLSearchParams({ url: href, name }).toString()}`}
              data-new-split-tab="true"
            >
              <EyeIcon />
              <span className="sr-only">View</span>
            </a>
          </Button>
        ) : (
          <Button
            variant="outline"
            className="bg-transparent"
            size="icon"
            onClick={handleDownload}
            aria-label={`Download ${name}`}
            title="Download"
          >
            <DownloadIcon />
            <span className="sr-only">Download</span>
          </Button>
        )}
      </div>
    </div>
  );
};
