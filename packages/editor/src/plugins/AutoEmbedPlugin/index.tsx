import {
  $getNodeByKey,
  $getSelection,
  MutationListener,
  NodeKey,
  PASTE_TAG,
  type LexicalEditor,
} from 'lexical';
import { useCallback, useEffect } from 'react';

import type { EmbedConfig, EmbedMatchResult } from '@lexical/react/LexicalAutoEmbedPlugin';
import { INSERT_IFRAME_COMMAND } from '@repo/editor/plugins/IFramePlugin';
import { $isLinkNode, LinkNode, AutoLinkNode } from '@lexical/link';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';

export const YoutubeEmbedConfig: EmbedConfig = {
  insertNode: (editor: LexicalEditor, result: EmbedMatchResult) => {
    editor.dispatchCommand(INSERT_IFRAME_COMMAND, {
      id: result.id,
      src: result.url,
      width: 560,
      height: 315,
      style: '',
      altText: result.url,
      showCaption: true,
    });
  },

  parseUrl: async (url: string) => {
    const match = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/.exec(url);

    const id = match ? (match?.[2].length === 11 ? match[2] : null) : null;

    if (id != null) {
      return {
        id,
        url,
      };
    }

    return null;
  },

  type: 'youtube-video',
};

const embedConfigs = [YoutubeEmbedConfig];

export default function AutoEmbedPlugin() {
  const [editor] = useLexicalComposerContext();

  const checkIfLinkNodeIsEmbeddable = useCallback(
    async (key: NodeKey) => {
      const url = editor.getEditorState().read(function () {
        const linkNode = $getNodeByKey(key);
        if ($isLinkNode(linkNode)) {
          return linkNode.getURL();
        }
        return;
      });
      if (url === undefined) {
        return;
      }
      for (const embedConfig of embedConfigs) {
        const urlMatch = await Promise.resolve(embedConfig.parseUrl(url));
        if (urlMatch != null) {
          embedLink(embedConfig, key);
        }
      }
    },
    [editor],
  );

  useEffect(() => {
    const listener: MutationListener = (nodeMutations, { updateTags, dirtyLeaves }) => {
      for (const [key, mutation] of nodeMutations) {
        if (mutation === 'created' && updateTags.has(PASTE_TAG) && dirtyLeaves.size <= 3) {
          checkIfLinkNodeIsEmbeddable(key);
        }
      }
    };
    return mergeRegister(
      ...[LinkNode, AutoLinkNode].map((Klass) =>
        editor.registerMutationListener(Klass, (...args) => listener(...args), {
          skipInitialization: true,
        }),
      ),
    );
  }, [editor]);

  const embedLink = useCallback(
    async function (embedConfig: EmbedConfig, key: NodeKey) {
      const linkNode = editor.getEditorState().read(() => {
        const node = $getNodeByKey(key);
        if ($isLinkNode(node)) {
          return node;
        }
        return null;
      });

      if ($isLinkNode(linkNode)) {
        const result = await Promise.resolve(embedConfig.parseUrl(linkNode.__url));
        if (result != null) {
          editor.update(() => {
            if (!$getSelection()) {
              linkNode.selectEnd();
            }
            embedConfig.insertNode(editor, result);
            if (linkNode.isAttached()) {
              linkNode.remove();
            }
          });
        }
      }
    },
    [editor],
  );

  return null;
}
