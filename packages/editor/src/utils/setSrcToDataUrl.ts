/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { NodeKey, SerializedLexicalNode } from 'lexical';
import { editorConfig } from '@repo/editor/config';
import { $getNodeByKey, $getRoot, createEditor } from 'lexical';
import { $isImageNode, ImageNode, signedUrlMap } from '@repo/editor/nodes/ImageNode';
import { $generateNodesFromSerializedNodes } from '@lexical/clipboard';
import { addSignedUrls } from '@repo/editor/utils/addSignedUrls';
import type { Services } from '@repo/editor/store';
import { $isAttachmentNode, AttachmentNode } from '@repo/editor/nodes/AttachmentNode';
import { serializeEditorState } from './editorState';

const editor = createEditor({ ...editorConfig, editable: false });

export const setSrcToDataUrl = async (
  serializedNodes: SerializedLexicalNode[],
  services: {
    getImageSignedUrl: Services['getImageSignedUrl'];
    getAttachmentSignedUrl: Services['getAttachmentSignedUrl'];
  },
) => {
  try {
    editor.update(
      () => {
        const nodes = $generateNodesFromSerializedNodes(serializedNodes);
        const root = $getRoot();
        root.clear();
        root.append(...nodes);
      },
      { discrete: true },
    );
    const editorState = await addSignedUrls(editor.getEditorState(), services);
    if (!editorState) return [];
    editor.setEditorState(editorState);
    const storedImageNodes = editorState.read(() => {
      const nodeMap = editorState._nodeMap;
      const keys = [...nodeMap.keys()];
      const nodes = keys.map((key: NodeKey) => $getNodeByKey(key));
      return nodes
        .filter($isImageNode)
        .filter((node: ImageNode) => node.__src.startsWith('/images/'));
    });

    const attachmentNodes = editorState.read(() => {
      const nodeMap = editorState._nodeMap;
      const keys = [...nodeMap.keys()];
      const nodes = keys.map((key: NodeKey) => $getNodeByKey(key));
      return nodes
        .filter($isAttachmentNode)
        .filter((node: AttachmentNode) => node.__url.startsWith('/attatchements/'));
    });

    const storedAttachmentNodes = attachmentNodes.filter((node: AttachmentNode) =>
      node.__url.startsWith('/attatchements/'),
    );

    await Promise.all([
      ...storedImageNodes.map(async (node: ImageNode) => {
        const signedUrl = signedUrlMap.get(node.__src);
        const dataUrl: string = await fetch(signedUrl ?? node.__src, { credentials: 'include' })
          .then((response) => response.blob())
          .then((blob) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            return new Promise((resolve) => {
              reader.onload = () => {
                resolve(reader.result as string);
              };
            });
          });
        editor.update(
          () => {
            node.setSrc(dataUrl);
          },
          { discrete: true },
        );
      }),
      ...storedAttachmentNodes.map(async (node: AttachmentNode) => {
        const signedUrl = node.getSignedUrl();
        const dataUrl: string = await fetch(signedUrl ?? node.__url, { credentials: 'include' })
          .then((response) => response.blob())
          .then((blob) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            return new Promise((resolve) => {
              reader.onload = () => {
                resolve(reader.result as string);
              };
            });
          });
        editor.update(
          () => {
            node.setUrl(dataUrl);
          },
          { discrete: true },
        );
      }),
    ]);
    const serializedEditorState = serializeEditorState(editor.getEditorState());
    return serializedEditorState.root.children;
  } catch (error) {
    console.error('Error adding image signed url:', error);
    return [];
  }
};
