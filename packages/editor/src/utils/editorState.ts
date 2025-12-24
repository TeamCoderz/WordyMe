/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  LexicalNode,
  SerializedLexicalNode,
  SerializedElementNode,
  SerializedRootNode,
  EditorState,
} from 'lexical';

import { $getRoot, $isElementNode } from 'lexical';

export interface SerializedEditorState<T extends SerializedLexicalNode = SerializedLexicalNode> {
  root: SerializedRootNode<T>;
}

export function exportNodeToJSON<SerializedNode extends SerializedLexicalNode>(
  node: LexicalNode,
  respectExcludeChildrenFromCopy: boolean = false,
): SerializedNode {
  const serializedNode = node.exportJSON();

  if ($isElementNode(node)) {
    const serializedChildren = (serializedNode as SerializedElementNode).children;
    const shouldExcludeChildrenFromCopy =
      respectExcludeChildrenFromCopy && (node as any).excludeChildrenFromCopy?.();
    // @ts-expect-error ignore type error
    if (shouldExcludeChildrenFromCopy) return serializedNode;
    const children = node.getChildren();
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const serializedChildNode = exportNodeToJSON(child, respectExcludeChildrenFromCopy);
      serializedChildren.push(serializedChildNode);
    }
  }

  // @ts-expect-error ignore type error
  return serializedNode;
}

export function $serializeEditorState(): SerializedEditorState {
  return {
    root: exportNodeToJSON($getRoot(), true),
  };
}

export function serializeEditorState(editorState: EditorState): SerializedEditorState {
  return editorState.read($serializeEditorState);
}
