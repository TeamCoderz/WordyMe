/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { InitialEditorStateType, NodeKey } from 'lexical';
import { editorConfig } from '@repo/editor/config';
import { $getNodeByKey, createEditor } from 'lexical';
import { $isImageNode, ImageNode } from '@repo/editor/nodes/ImageNode';
import type { Services } from '@repo/editor/store';
import { $isAttachmentNode, AttachmentNode } from '@repo/editor/nodes/AttachmentNode';
import { $isScoreNode, ScoreNode } from '@repo/editor/nodes/ScoreNode';

const editor = createEditor({ ...editorConfig, editable: false });

export const addSignedUrls = async (
  initialEditorState: InitialEditorStateType,
  services: {
    getImageSignedUrl: Services['getImageSignedUrl'];
    getAttachmentSignedUrl: Services['getAttachmentSignedUrl'];
  },
) => {
  try {
    if (!initialEditorState) return null;
    switch (typeof initialEditorState) {
      case 'string': {
        const parsedEditorState = editor.parseEditorState(initialEditorState);
        editor.setEditorState(parsedEditorState);
        break;
      }
      case 'object': {
        editor.setEditorState(initialEditorState);
        break;
      }
      case 'function': {
        editor.update(
          () => {
            initialEditorState(editor);
          },
          { discrete: true },
        );
        break;
      }
    }
    const editorState = editor.getEditorState();
    const imageNodes = editorState.read(() => {
      const nodeMap = editorState._nodeMap;
      const keys = [...nodeMap.keys()];
      const nodes = keys.map((key: NodeKey) => $getNodeByKey(key));
      return nodes.filter($isImageNode);
    });
    const storedImageNodes = imageNodes.filter((node: ImageNode) =>
      node.__src.startsWith('/images/'),
    );
    const attachmentNodes = editorState.read(() => {
      const nodeMap = editorState._nodeMap;
      const keys = [...nodeMap.keys()];
      const nodes = keys.map((key: NodeKey) => $getNodeByKey(key));
      return nodes.filter($isAttachmentNode);
    });
    const storedAttachmentNodes = attachmentNodes.filter((node: AttachmentNode) =>
      node.__url.startsWith('/attatchements/'),
    );
    const scoreNodes = editorState.read(() => {
      const nodeMap = editorState._nodeMap;
      const keys = [...nodeMap.keys()];
      const nodes = keys.map((key: NodeKey) => $getNodeByKey(key));
      return nodes.filter($isScoreNode);
    });
    const storedScoreNodes = scoreNodes.filter((node: ScoreNode) =>
      node.__attachmentUrl.startsWith('/attatchements/'),
    );
    await Promise.all([
      ...storedImageNodes.map(async (node: ImageNode) => {
        const signedUrl = node.getSignedUrl();
        if (signedUrl) return;
        const src = node.__src;
        const fileName = src.split('/').pop()!;
        const { data, error } = await services.getImageSignedUrl(fileName);
        if (error) throw error;
        if (data) {
          editor.update(
            () => {
              node.setSignedUrl(data.signedUrl);
            },
            { discrete: true },
          );
        }
      }),
      ...storedAttachmentNodes.map(async (node: AttachmentNode) => {
        const signedUrl = node.getSignedUrl();
        if (signedUrl) return;
        const url = node.__url;
        const fileName = url.split('/').pop()!;
        const { data, error } = await services.getAttachmentSignedUrl(fileName);
        if (error) throw error;
        if (data) {
          editor.update(
            () => {
              node.setSignedUrl(data.signedUrl);
            },
            { discrete: true },
          );
        }
      }),
      ...storedScoreNodes.map(async (node: ScoreNode) => {
        const signedUrl = node.getAttachmentSignedUrl();
        if (signedUrl) return;
        const url = node.__attachmentUrl;
        const fileName = url.split('/').pop()!;
        const { data, error } = await services.getAttachmentSignedUrl(fileName);
        if (error) throw error;
        if (data) {
          editor.update(
            () => {
              node.setAttachmentSignedUrl(data.signedUrl);
            },
            { discrete: true },
          );
        }
      }),
    ]);
    return editor.getEditorState();
  } catch (error) {
    console.error('Error adding signed urls:', error);
    return null;
  }
};
