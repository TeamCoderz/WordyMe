/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { AttachmentViewer } from '@/components/AttachmentViewer';

const searchSchema = z.object({
  url: z.string().min(1, 'URL is required'),
  name: z.string().optional(),
  mimeType: z.string().optional().nullable(),
});

export const Route = createFileRoute('/_authed/attachment')({
  component: RouteComponent,
  validateSearch: searchSchema,
});

function RouteComponent() {
  const { url, name, mimeType } = Route.useSearch();
  return (
    <AttachmentViewer
      url={url}
      name={name}
      mimeType={mimeType}
      className="w-full flex flex-1 flex-col h-[calc(100svh---spacing(28)-1px)]! max-h-[calc(100svh---spacing(28)-1px)]!"
    />
  );
}
