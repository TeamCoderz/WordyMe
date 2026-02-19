/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

'use client';
import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  $isRootNode,
  HISTORY_MERGE_TAG,
  $getNodeByKey,
  MutationListener,
  HISTORIC_TAG,
  LexicalCommand,
} from 'lexical';
import { $findMatchingParent, $wrapNodeInElement, mergeRegister } from '@lexical/utils';
import { COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';

import { $createScoreNode, ScoreNode, ScorePayload } from '@repo/editor/nodes/ScoreNode';
import { $isImageNode } from '@repo/editor/nodes/ImageNode';
import { useActions } from '@repo/editor/store';
import { ANNOUNCE_COMMAND } from '@repo/editor/commands';

export type InsertScorePayload = Readonly<ScorePayload>;

export const INSERT_SCORE_COMMAND: LexicalCommand<InsertScorePayload> = createCommand();

const processingNodeKeys = new Set<string>();

export default function ScorePlugin() {
  const [editor] = useLexicalComposerContext();
  const { uploadAttachment, getAttachmentSignedUrl } = useActions();

  useEffect(() => {
    if (!editor.hasNodes([ScoreNode])) {
      throw new Error('ScorePlugin: ScoreNode not registered on editor');
    }
    const uploadDataUrl = async (dataUrl: string, filename: string, mimeType: string) => {
      const blob = await fetch(dataUrl, { credentials: 'include' }).then((response) =>
        response.blob(),
      );
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

    const handleScoreNodeCreated = async (key: string, node: ScoreNode): Promise<void> => {
      const toastId = `attachment-${node.getKey()}`;
      try {
        const url = node.getAttachmentUrl();
        if (url.startsWith('/attatchements/')) {
          const signedUrl = node.getAttachmentSignedUrl();
          if (signedUrl) return;

          const fileName = url.split('/').pop()!;
          const { data, error } = await getAttachmentSignedUrl(fileName);
          if (error) throw error;
          if (data) {
            editor.update(
              () => {
                const createdNode: null | ScoreNode = $getNodeByKey(key);
                if (createdNode) createdNode.setAttachmentSignedUrl(data.signedUrl);
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
          const filename = `${node.getAltText()}.${extension}`;

          const { url: newUrl, signedUrl } = await uploadDataUrl(url, filename, mimeType);

          editor.update(
            () => {
              const node: null | ScoreNode = $getNodeByKey(key);
              if (node) {
                node.setAttachmentUrl(newUrl);
                node.setAttachmentSignedUrl(signedUrl);
              }
            },
            { tag: HISTORIC_TAG },
          );
          editor.dispatchCommand(ANNOUNCE_COMMAND, {
            id: toastId,
            type: 'success',
            message: {
              title: 'Score uploaded successfully',
            },
          });
        }
      } catch (error) {
        console.error(error);
        editor.dispatchCommand(ANNOUNCE_COMMAND, {
          id: toastId,
          type: 'error',
          message: {
            title: 'Loading score failed',
            subtitle: 'Please try again later',
          },
        });
      } finally {
        processingNodeKeys.delete(key);
      }
    };

    const scoreMutationListener: MutationListener = (mutations) => {
      editor.getEditorState().read(() => {
        for (const [key, mutation] of mutations) {
          if (mutation === 'created') {
            if (processingNodeKeys.has(key)) continue;
            const node: null | ScoreNode = $getNodeByKey(key);
            if (!node) continue;
            processingNodeKeys.add(key);
            handleScoreNodeCreated(key, node);
          }
        }
      });
    };
    return mergeRegister(
      editor.registerCommand<InsertScorePayload>(
        INSERT_SCORE_COMMAND,
        (payload) => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const imageNode = $findMatchingParent(selection.anchor.getNode(), $isImageNode);
            imageNode?.remove();
          }
          const scoreNode = $createScoreNode(payload);
          scoreNode.append($createTextNode(payload.altText || 'Score'));
          $insertNodes([scoreNode]);
          if ($isRootNode(scoreNode.getParentOrThrow())) {
            $wrapNodeInElement(scoreNode, $createParagraphNode).selectEnd();
          }
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerMutationListener(ScoreNode, scoreMutationListener),
    );
  }, [editor]);

  return null;
}
