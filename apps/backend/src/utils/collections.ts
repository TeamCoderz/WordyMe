import { asc, desc, eq, gte, isNotNull, like, SQL } from 'drizzle-orm';
import { SQLiteColumn, SQLiteSelect } from 'drizzle-orm/sqlite-core';
import { PaginationQuery } from '../schemas/pagination.js';
import { db } from '../lib/db.js';

export class CollectionQuery<Q extends SQLiteSelect> {
  query: Q;

  constructor(query: Q) {
    this.query = query;
  }

  filter(column: SQLiteColumn, value: string | number | boolean | undefined): this {
    if (value !== undefined) {
      this.query = this.query.where(eq(column, value));
    }
    return this;
  }

  search(column: SQLiteColumn, searchTerm: string | undefined): this {
    if (searchTerm !== undefined) {
      this.query = this.query.where(like(column, `%${searchTerm}%`));
    }
    return this;
  }

  notNull(column: SQLiteColumn): this {
    this.query = this.query.where(isNotNull(column));
    return this;
  }

  lastNDays(column: SQLiteColumn, days: number | undefined): this {
    if (days !== undefined && days > 0) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - days);
      this.query = this.query.where(gte(column, daysAgo));
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
    return await this.query;
  }

  async getPaginatedResult({ page, limit }: PaginationQuery) {
    console.log(this.query.toSQL());
    const offset = (page - 1) * limit;

    const total = await db.$count(this.query);

    const items = await this.query.limit(limit).offset(offset);

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
