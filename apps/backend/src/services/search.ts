/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { db } from '../lib/db.js';
import { and, eq, sql } from 'drizzle-orm';
import { integer, sqliteTable } from 'drizzle-orm/sqlite-core';
import { documentsTable } from '../models/documents.js';
import { documentSearchIndexTable } from '../models/document-search-index.js';
import { buildPrefixMatchQuery, tokenizeSearchQuery } from '../utils/search.js';

const documentSearchFtsTable = sqliteTable('document_search_fts', {
  rowid: integer('rowid'),
});

const runSearch = async (userId: string, match: string, limit: number) => {
  if (!match) return [];

  const rows = await db
    .select({
      id: documentsTable.id,
      title: documentsTable.name,
      snippet: sql<string>`snippet(document_search_fts, 1, '[', ']', ' ... ', 20)`.as('snippet'),
      score: sql<number>`bm25(document_search_fts)`.as('score'),
    })
    .from(documentSearchFtsTable)
    .innerJoin(
      documentSearchIndexTable,
      sql`document_search_index.rowid = ${documentSearchFtsTable.rowid}`,
    )
    .innerJoin(documentsTable, eq(documentsTable.id, documentSearchIndexTable.documentId))
    .where(and(eq(documentsTable.userId, userId), sql`document_search_fts MATCH ${match}`))
    .orderBy(sql`bm25(document_search_fts)`)
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    snippet: String(row.snippet ?? ''),
    score: Number(row.score ?? 0),
  }));
};

export const searchDocuments = async (userId: string, query: string, limit = 10) => {
  const safeLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
  const match = buildPrefixMatchQuery(tokenizeSearchQuery(query));
  return runSearch(userId, match, safeLimit);
};
