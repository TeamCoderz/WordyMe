import type { ChangeHandler, LinkMatcher } from '@lexical/link';
import type { LexicalEditor } from 'lexical';
import type { JSX } from 'react';

import { AutoLinkNode, LinkNode } from '@lexical/link';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';
import invariant from '@repo/shared/invariant';
import { registerAutoLink, createLinkMatcherWithRegExp } from './LexicalAutoLinkExtension';
import { useActions } from '@repo/editor/store';

function useAutoLink(
  editor: LexicalEditor,
  matchers: Array<LinkMatcher>,
  onChange?: ChangeHandler,
): void {
  useEffect(() => {
    if (!editor.hasNodes([AutoLinkNode])) {
      invariant(false, 'LexicalAutoLinkPlugin: AutoLinkNode not registered on editor');
    }
  });
  useEffect(() => {
    return registerAutoLink(editor, {
      changeHandlers: onChange ? [onChange] : [],
      matchers,
    });
  }, [editor, matchers, onChange]);
}

export function LexicalAutoLinkPlugin({
  matchers,
  onChange,
}: {
  matchers: Array<LinkMatcher>;
  onChange?: ChangeHandler;
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useAutoLink(editor, matchers, onChange);

  return null;
}

const isLookbehindSupported = (() => {
  try {
    new RegExp('(?<=x)');
    return true;
  } catch {
    return false;
  }
})();

const URL_REGEX = isLookbehindSupported
  ? /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)(?<![-.+():%])/
  : /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

const EMAIL_REGEX =
  /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

const MATCHERS = [
  createLinkMatcherWithRegExp(URL_REGEX, (text) => {
    return text.startsWith('http') ? text : `https://${text}`;
  }),
  createLinkMatcherWithRegExp(EMAIL_REGEX, (text) => {
    return `mailto:${text}`;
  }),
];

export function AutoLinkPlugin() {
  return <LexicalAutoLinkPlugin matchers={MATCHERS} />;
}

export function LinkNavigatePlugin() {
  const [editor] = useLexicalComposerContext();
  const { navigate } = useActions();

  useEffect(() => {
    return editor.registerMutationListener(LinkNode, (mutations) => {
      for (const [key, mutation] of mutations) {
        if (mutation === 'created') {
          const element = editor.getElementByKey(key);
          if (element) {
            const href = element.getAttribute('href');
            if (href?.startsWith(location.origin) || href?.startsWith('/')) {
              element.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                navigate(href.replace(location.origin, ''));
              });
            }
          }
        }
      }
    });
  }, []);

  return null;
}
