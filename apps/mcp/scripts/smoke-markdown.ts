/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { fromMarkdown, toMarkdown } from '../src/markdown.js';

const sample = `# Smoke Test

Some **bold** and *italic* text with a [link](https://wordy.me).

## A list

- one
- two
  - nested

## A table

| Col A | Col B |
| ----- | ----- |
| 1     | 2     |

## Code

\`\`\`ts
const x: number = 1;
\`\`\`

\`\`\`mermaid
graph TD; A-->B;
\`\`\`
`;

const state = fromMarkdown(sample);
const roundTripped = toMarkdown(state);

const rootTypes = state.root.children.map((node) => node.type);
if (rootTypes[0] !== 'page-setup' || rootTypes[1] !== 'page') {
  throw new Error(`Expected the editor's page scaffold, got root children: ${rootTypes}`);
}
if (!roundTripped.includes('## A table') || !roundTripped.includes('```mermaid')) {
  throw new Error('Round-trip lost block structure');
}

console.log('--- root structure ---');
console.log(rootTypes.join(' > '));
console.log('--- markdown round-trip ---');
console.log(roundTripped);
