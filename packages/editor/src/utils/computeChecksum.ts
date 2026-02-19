/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { SerializedEditorState } from 'lexical';
import { computeSha256 } from '@repo/shared/checksum';

export const computeChecksum = (serializedEditorState: SerializedEditorState) => {
  const serializedRoot = serializedEditorState.root;
  delete serializedRoot.textFormat;
  delete serializedRoot.textStyle;
  const stringifiedEditorState = JSON.stringify(serializedEditorState);
  const checksum = computeSha256(stringifiedEditorState);
  return checksum;
};
