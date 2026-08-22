/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import './dom-shim.js';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  createDocumentWithRevision,
  getDocumentByHandle,
  getDocumentById,
  getUserDocuments,
  searchDocuments,
  updateDocument,
} from '@repo/sdk/documents.ts';
import { createRevision, getRevisionById } from '@repo/sdk/revisions.ts';
import { generatePositionKeyBetween, getSiblings, sortByPosition } from '@repo/lib/utils/position';
import { computeChecksum } from '@repo/editor/utils/computeChecksum';
import { generateText } from '@repo/editor/utils/generateText';
import { assertConfig, configureClient, ensureAuth } from './auth.js';
import { fromMarkdown, toMarkdown } from './markdown.js';

const REVISION_NAME = 'via Claude';

type ToolResult = { content: Array<{ type: 'text'; text: string }>; isError?: boolean };

function ok(text: string): ToolResult {
  return { content: [{ type: 'text', text }] };
}

function fail(message: string): ToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

async function run(handler: () => Promise<ToolResult>): Promise<ToolResult> {
  try {
    await ensureAuth();
    return await handler();
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function resolveDocument(input: { id?: string; handle?: string }) {
  if (input.id) {
    const { data, error } = await getDocumentById(input.id);
    if (error || !data) throw new Error(`Document not found for id "${input.id}"`);
    return data;
  }
  if (input.handle) {
    const { data, error } = await getDocumentByHandle(input.handle);
    if (error || !data) throw new Error(`Document not found for handle "${input.handle}"`);
    return data;
  }
  throw new Error('Provide either "id" or "handle"');
}

async function markdownToRevisionFields(markdown: string) {
  const state = fromMarkdown(markdown);
  return {
    content: JSON.stringify(state),
    checksum: computeChecksum(state),
    text: generateText(state),
  };
}

const server = new McpServer({ name: 'wordyme', version: '0.1.0' });

server.registerTool(
  'list_spaces',
  {
    description:
      'List all Spaces (top-level workspaces) in the WordyMe wiki, including folder-type container spaces.',
    inputSchema: {},
  },
  async () =>
    run(async () => {
      const { data, error } = await getUserDocuments({ documentType: 'space' });
      if (error) throw new Error(error.message);
      const spaces = (data ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        parentId: s.parentId,
        isFolder: s.isContainer,
      }));
      return ok(JSON.stringify(spaces, null, 2));
    }),
);

server.registerTool(
  'list_documents',
  {
    description:
      'List the documents and folders inside one Space as a flat list; reconstruct the tree via parentId.',
    inputSchema: { space_id: z.string().describe('The Space id, from list_spaces') },
  },
  async ({ space_id }) =>
    run(async () => {
      const { data, error } = await getUserDocuments({ spaceId: space_id });
      if (error) throw new Error(error.message);
      const documents = (data ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        handle: d.handle,
        parentId: d.parentId,
        isFolder: d.isContainer,
        updatedAt: d.updatedAt,
      }));
      return ok(JSON.stringify(documents, null, 2));
    }),
);

server.registerTool(
  'search_documents',
  {
    description: 'Full-text search across the wiki. Returns matching documents with snippets.',
    inputSchema: {
      query: z.string().describe('Search terms'),
      space_id: z.string().optional().describe('Restrict the search to one Space'),
      limit: z.number().int().min(1).max(50).optional(),
    },
  },
  async ({ query, space_id, limit }) =>
    run(async () => {
      const { data, error } = await searchDocuments(query, limit ?? 20, space_id);
      if (error) throw new Error(error.message);
      return ok(JSON.stringify(data ?? [], null, 2));
    }),
);

server.registerTool(
  'read_document',
  {
    description: 'Read one document and return its content as Markdown.',
    inputSchema: {
      id: z.string().optional().describe('Document id'),
      handle: z.string().optional().describe('Document handle (URL slug), alternative to id'),
    },
  },
  async (input) =>
    run(async () => {
      const document = await resolveDocument(input);
      if (!document.currentRevisionId) {
        return ok(`# ${document.name}\n\n(This document has no content yet.)`);
      }
      const { data: revision, error } = await getRevisionById(document.currentRevisionId);
      if (error || !revision) throw new Error('Could not load the document content');
      const markdown = toMarkdown(JSON.parse(revision.content));
      return ok(markdown);
    }),
);

server.registerTool(
  'create_note',
  {
    description:
      'Create a new note in a Space from Markdown content. Returns the new document id and handle.',
    inputSchema: {
      space_id: z.string().describe('The Space id, from list_spaces'),
      name: z.string().describe('The note title'),
      markdown: z.string().describe('The note body as Markdown'),
      parent_id: z
        .string()
        .optional()
        .describe('Optional folder (container document) id to create the note inside'),
    },
  },
  async ({ space_id, name, markdown, parent_id }) =>
    run(async () => {
      const { data: documents, error: listError } = await getUserDocuments({ spaceId: space_id });
      if (listError) throw new Error(listError.message);
      const siblings = sortByPosition(getSiblings(documents ?? [], parent_id ?? null));
      const last = siblings.at(-1);
      const position = last ? generatePositionKeyBetween(last.position || 'a0', null) : 'a0';

      const revision = await markdownToRevisionFields(markdown);
      const { data, error } = await createDocumentWithRevision({
        name,
        icon: 'file',
        parentId: parent_id ?? null,
        position,
        spaceId: space_id,
        isContainer: false,
        clientId: randomUUID(),
        documentType: 'note',
        revision: { ...revision, revisionName: REVISION_NAME, makeCurrentRevision: true },
      });
      if (error || !data) throw new Error(error?.message ?? 'Failed to create the note');
      return ok(JSON.stringify({ id: data.id, handle: data.handle, name: data.name }, null, 2));
    }),
);

server.registerTool(
  'update_document',
  {
    description:
      'Replace a document body with new Markdown content. Saved as a new revision named "via Claude"; earlier revisions stay restorable from Revisions History.',
    inputSchema: {
      id: z.string().optional().describe('Document id'),
      handle: z.string().optional().describe('Document handle (URL slug), alternative to id'),
      markdown: z.string().describe('The full new document body as Markdown'),
    },
  },
  async ({ markdown, ...input }) =>
    run(async () => {
      const document = await resolveDocument(input);
      const revision = await markdownToRevisionFields(markdown);
      const { data, error } = await createRevision({
        documentId: document.id,
        ...revision,
        revisionName: REVISION_NAME,
        makeCurrentRevision: true,
      });
      if (error || !data) throw new Error(error?.message ?? 'Failed to update the document');
      return ok(
        JSON.stringify({ id: document.id, handle: document.handle, revisionId: data.id }, null, 2),
      );
    }),
);

server.registerTool(
  'move_document',
  {
    description:
      'Move a document or folder into another folder of the same Space, or to the Space root. It is placed last among its new siblings.',
    inputSchema: {
      id: z.string().optional().describe('Document id'),
      handle: z.string().optional().describe('Document handle (URL slug), alternative to id'),
      parent_id: z
        .string()
        .nullable()
        .describe('Target folder id (from list_documents), or null for the Space root'),
    },
  },
  async ({ parent_id, ...input }) =>
    run(async () => {
      const document = await resolveDocument(input);
      if (!document.spaceId) throw new Error('Only documents inside a Space can be moved');
      const { data: documents, error: listError } = await getUserDocuments({
        spaceId: document.spaceId,
      });
      if (listError) throw new Error(listError.message);
      const all = documents ?? [];

      if (parent_id) {
        const target = all.find((d) => d.id === parent_id);
        if (!target) throw new Error(`Folder "${parent_id}" not found in this Space`);
        if (!target.isContainer) throw new Error(`"${target.name}" is a note, not a folder`);
        for (let cursor = target; cursor;) {
          if (cursor.id === document.id) {
            throw new Error('Cannot move a folder into itself or one of its subfolders');
          }
          const next = cursor.parentId ? all.find((d) => d.id === cursor.parentId) : undefined;
          if (!next) break;
          cursor = next;
        }
      }

      const siblings = sortByPosition(getSiblings(all, parent_id)).filter(
        (d) => d.id !== document.id,
      );
      const last = siblings.at(-1);
      const position = last ? generatePositionKeyBetween(last.position || 'a0', null) : 'a0';
      const { data, error } = await updateDocument(document.id, { parentId: parent_id, position });
      if (error || !data) throw new Error(error?.message ?? 'Failed to move the document');
      return ok(
        JSON.stringify({ id: data.id, handle: data.handle, parentId: data.parentId }, null, 2),
      );
    }),
);

assertConfig();
configureClient();
await server.connect(new StdioServerTransport());
