/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';
import { Button } from '@repo/ui/components/button';
import { Check, Copy, ExternalLink } from '@repo/ui/components/icons';

const UPDATE_COMMAND = 'docker compose pull && docker compose up -d';

/**
 * Replaces the "apply update" button from the original brief.
 *
 * WordyMe runs inside a container, so updating means pulling an image and
 * recreating the container — both operations on the Docker host. The only way
 * to do that from in here is mounting the Docker socket, which would hand
 * root-equivalent control of the host to the web app and undo the container
 * hardening. So: hand over the command instead of pretending to run it.
 */
export function UpdateInstructionsDialog({
  open,
  onOpenChange,
  latest,
  releaseUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  latest: string | null;
  releaseUrl: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(UPDATE_COMMAND);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Updating WordyMe{latest ? ` to ${latest}` : ''}</DialogTitle>
          <DialogDescription>
            WordyMe runs in a container and cannot update itself. Run this on the machine hosting
            it, from the folder holding your compose file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <pre className="bg-muted overflow-x-auto rounded-md p-3 pr-12 text-xs">
              <code>{UPDATE_COMMAND}</code>
            </pre>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1.5 right-1.5 size-7"
              onClick={copy}
              aria-label="Copy command"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </Button>
          </div>

          <p className="text-muted-foreground text-xs">
            Your documents and uploaded files live in a Docker volume and are not touched by
            updating. Taking a backup first is still the safe habit — see{' '}
            <a
              href="https://github.com/TeamCoderz/WordyMe/blob/main/DOCKER.md#data-persistence"
              target="_blank"
              rel="noreferrer noopener"
              className="underline underline-offset-2"
            >
              Data Persistence
            </a>{' '}
            in the Docker guide.
          </p>

          {releaseUrl ? (
            <a
              href={releaseUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs underline underline-offset-2"
            >
              What changed in this release
              <ExternalLink className="size-3" />
            </a>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
