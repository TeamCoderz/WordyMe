/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $findMatchingParent, $wrapNodeInElement, mergeRegister } from '@lexical/utils';
import {
  $createParagraphNode,
  $getNodeByKey,
  $getPreviousSelection,
  $getRoot,
  $getSelection,
  $insertNodes,
  $isElementNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  COMMAND_PRIORITY_EDITOR,
  HISTORY_MERGE_TAG,
  HISTORIC_TAG,
  createCommand,
  LexicalCommand,
  MutationListener,
} from 'lexical';
import { useEffect } from 'react';

import {
  $createAttachmentNode,
  AttachmentNode,
  AttachmentPayload,
} from '@repo/editor/nodes/AttachmentNode';
import { $isPageNode, $isPageSetupNode } from '@repo/editor/nodes/PageNode';
import { useActions } from '@repo/editor/store';
import { ANNOUNCE_COMMAND } from '@repo/editor/commands';

export type InsertAttachmentPayload = Readonly<AttachmentPayload>;

export const INSERT_ATTACHMENT_COMMAND: LexicalCommand<InsertAttachmentPayload> = createCommand();

const processingNodeKeys = new Set<string>();

function $ensureValidAttachmentInsertionSelection() {
  // An async upload can leave the editor focused on a page structure node. Move only
  // those unsafe selections to a concrete body block and preserve normal caret insertion.
  const selection = $getSelection() || $getPreviousSelection();
  let selectionNode;
  if ($isRangeSelection(selection)) {
    selectionNode = $getNodeByKey(selection.focus.key);
  } else {
    const selectedNodes = selection?.getNodes();
    selectionNode = selectedNodes?.[selectedNodes.length - 1];
  }

  const needsDocumentBodyFallback =
    !selectionNode ||
    $isRootOrShadowRoot(selectionNode) ||
    $isPageNode(selectionNode) ||
    $isPageSetupNode(selectionNode);

  if (!needsDocumentBodyFallback) return;

  const selectedPage = selectionNode ? $findMatchingParent(selectionNode, $isPageNode) : null;
  const pages = $getRoot().getChildren().filter($isPageNode);
  const fallbackPage = selectedPage ?? pages[pages.length - 1];
  const insertionContainer = fallbackPage?.getContentNode() ?? $getRoot();
  const lastDescendant = insertionContainer.getLastDescendant();
  const hasBlockInsertionPoint =
    lastDescendant &&
    $findMatchingParent(
      lastDescendant,
      (node) => $isElementNode(node) && !node.isInline() && !$isRootOrShadowRoot(node),
    );

  if (hasBlockInsertionPoint) {
    insertionContainer.selectEnd();
  } else {
    const paragraph = $createParagraphNode();
    insertionContainer.append(paragraph);
    paragraph.selectEnd();
  }
}

export function $insertAttachmentNode(payload: InsertAttachmentPayload): AttachmentNode {
  $ensureValidAttachmentInsertionSelection();
  const attachmentNode = $createAttachmentNode(payload);
  $insertNodes([attachmentNode]);
  if ($isRootOrShadowRoot(attachmentNode.getParentOrThrow())) {
    $wrapNodeInElement(attachmentNode, $createParagraphNode);
  }
  return attachmentNode;
}

export default function AttachmentPlugin() {
  const [editor] = useLexicalComposerContext();
  const { uploadAttachment, getAttachmentSignedUrl } = useActions();

  useEffect(() => {
    if (!editor.hasNodes([AttachmentNode]))
      throw new Error('AttachmentPlugin: AttachmentNode is not registered on editor');

    const uploadDataUrl = async (dataUrl: string, filename: string, mimeType: string) => {
      const blob = await fetch(dataUrl).then((response) => response.blob());
      const file = new File([blob], filename, { type: mimeType });
      const { data: uploadData, error: uploadError } = await uploadAttachment(file);
      if (uploadError) throw uploadError;
      if (!uploadData) throw new Error('Uploading attachment failed');
      const fileName = uploadData.path.split('/').pop()!;
      const { data: signedUrlData, error: signedUrlError } = await getAttachmentSignedUrl(fileName);
      if (signedUrlError) throw signedUrlError;
      if (!signedUrlData) throw new Error('Getting attachment signed url failed');
      return {
        url: `/attatchements/${fileName}`,
        signedUrl: signedUrlData.signedUrl,
      };
    };

    const handleAttachmentNodeCreated = async (
      key: string,
      node: AttachmentNode,
    ): Promise<void> => {
      const toastId = `attachment-${node.getKey()}`;
      try {
        const name = node.getName();
        const url = node.getUrl();
        if (url.startsWith('/attatchements/')) {
          const signedUrl = node.getSignedUrl();
          if (signedUrl) return;

          const fileName = url.split('/').pop()!;
          const { data, error } = await getAttachmentSignedUrl(fileName);
          if (error) throw error;
          if (data) {
            editor.update(
              () => {
                const createdNode: null | AttachmentNode = $getNodeByKey(key);
                if (createdNode) createdNode.setSignedUrl(data.signedUrl);
              },
              { tag: HISTORY_MERGE_TAG },
            );
          }
        } else if (url.startsWith('data:')) {
          editor.dispatchCommand(ANNOUNCE_COMMAND, {
            id: toastId,
            type: 'loading',
            message: {
              title: 'Uploading image',
              subtitle: 'image is being uploaded in the background',
            },
          });

          const header = url.split(',')[0];
          const mimeType = header.split(';')[0].split(':')[1];
          const extension = mimeType.split('/')[1].split('+')[0];
          const filename = `${name}.${extension}`;

          const { url: newUrl, signedUrl } = await uploadDataUrl(url, filename, mimeType);

          editor.update(
            () => {
              const node: null | AttachmentNode = $getNodeByKey(key);
              if (node) {
                node.setUrl(newUrl);
                node.setSignedUrl(signedUrl);
              }
            },
            { tag: HISTORIC_TAG },
          );
          editor.dispatchCommand(ANNOUNCE_COMMAND, {
            id: toastId,
            type: 'success',
            message: {
              title: 'Attachment uploaded successfully',
            },
          });
        }
      } catch (error) {
        console.error(error);
        editor.dispatchCommand(ANNOUNCE_COMMAND, {
          id: toastId,
          type: 'error',
          message: {
            title: 'Loading attachment failed',
            subtitle: 'Please try again later',
          },
        });
      } finally {
        processingNodeKeys.delete(key);
      }
    };

    const attachmentMutationListener: MutationListener = (mutations) => {
      editor.getEditorState().read(() => {
        for (const [key, mutation] of mutations) {
          if (mutation === 'created') {
            if (processingNodeKeys.has(key)) continue;
            const node: null | AttachmentNode = $getNodeByKey(key);
            if (!node) continue;
            processingNodeKeys.add(key);
            handleAttachmentNodeCreated(key, node);
          }
        }
      });
    };

    return mergeRegister(
      editor.registerCommand(
        INSERT_ATTACHMENT_COMMAND,
        (payload) => {
          $insertAttachmentNode(payload);
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerMutationListener(AttachmentNode, attachmentMutationListener),
    );
  }, [editor]);

  return null;
}
