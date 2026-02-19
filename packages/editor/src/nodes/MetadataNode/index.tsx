/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { DecoratorNode, LexicalNode } from 'lexical';
import { PageSetupNode, SerializedPageSetupNode } from '@repo/editor/nodes/PageNode';
export class MetadataNode extends DecoratorNode<null> {
  static getType(): string {
    return 'metadata';
  }
  static importJSON(serializedNode: SerializedPageSetupNode): LexicalNode {
    return PageSetupNode.importJSON(serializedNode);
  }
}
