/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { and, asc, desc, eq, gte, isNotNull, like, SQL } from 'drizzle-orm';
import { SQLiteColumn, SQLiteSelect } from 'drizzle-orm/sqlite-core';
import { PaginationQuery } from '../schemas/pagination.js';
import { db } from '../lib/db.js';

/**
 * IMPORTANT: Don't pass a query with existing where clauses to this class.
 * It will not work as expected.
 */
export class CollectionQuery<Q extends SQLiteSelect> {
  query: Q;
  whereClauses: SQL[] = [];

  constructor(query: Q) {
    this.query = query;
  }

  filter(column: SQLiteColumn, value: string | number | boolean | undefined): this {
    if (value !== undefined) {
      this.whereClauses.push(eq(column, value));
    }
    return this;
  }

  search(column: SQLiteColumn, searchTerm: string | undefined): this {
    if (searchTerm !== undefined) {
      this.whereClauses.push(like(column, `%${searchTerm}%`));
    }
    return this;
  }

  notNull(column: SQLiteColumn): this {
    this.whereClauses.push(isNotNull(column));
    return this;
  }

  lastNDays(column: SQLiteColumn, days: number | undefined): this {
    if (days !== undefined && days > 0) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - days);
      this.whereClauses.push(gte(column, daysAgo));
    }
    return this;
  }

  order(column: SQLiteColumn | undefined, direction: 'asc' | 'desc' | undefined): this {
    if (column) {
      const dirFn = direction === 'desc' ? desc : asc;
      this.query = this.query.orderBy(dirFn(column));
    }
    return this;
  }

  limit(count: number | undefined): this {
    if (count !== undefined && count > 0) {
      this.query = this.query.limit(count);
    }
    return this;
  }

  async getResult() {
    return await this.query.where(and(...this.whereClauses));
  }

  async getPaginatedResult({ page, limit }: PaginationQuery) {
    console.log(this.query.toSQL());
    const offset = (page - 1) * limit;

    const total = await db.$count(this.query.where(and(...this.whereClauses)));

    const items = await this.query
      .where(and(...this.whereClauses))
      .limit(limit)
      .offset(offset);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
