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
} from '@repo/ui/components/icons';
import { NodeKey } from 'lexical';
import { cn } from '@repo/ui/lib/utils';
import { Button } from '@repo/ui/components/button';

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
  const href = url.startsWith('data:') ? url : (signedUrl ?? '#');
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
        <Button variant="outline" className="bg-transparent" size="icon" asChild>
          <a href={href} download={name} aria-label={`Download ${name}`}>
            <DownloadIcon />
            <span className="sr-only">Download</span>
          </a>
        </Button>
      </div>
    </div>
  );
};
