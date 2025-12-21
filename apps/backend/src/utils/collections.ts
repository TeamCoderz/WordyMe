import { asc, desc, eq, gte, ilike, isNotNull } from 'drizzle-orm';
import { SQLiteColumn, SQLiteSelect } from 'drizzle-orm/sqlite-core';
import { PaginationQuery } from '../schemas/pagination.js';

export class CollectionQuery<Q extends SQLiteSelect> {
  query: Q;

  constructor(query: Q) {
    this.query = query;
  }

  filter(column: SQLiteColumn, value: string | undefined): this {
    if (value !== undefined) {
      this.query = this.query.where(eq(column, value));
    }
    return this;
  }

  search(column: SQLiteColumn, searchTerm: string | undefined): this {
    if (searchTerm !== undefined) {
      this.query = this.query.where(ilike(column, `%${searchTerm}%`));
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

  async getResult() {
    return await this.query;
  }
}

export class PaginatedCollectionQuery<
  Q extends SQLiteSelect,
  CQ extends SQLiteSelect,
> extends CollectionQuery<Q> {
  countQuery: CQ;
  page: number;
  limit: number;

  constructor(query: Q, countQuery: CQ, pagination: PaginationQuery) {
    super(query);
    this.countQuery = countQuery;
    this.page = pagination.page;
    this.limit = pagination.limit;
  }

  filter(column: SQLiteColumn, value: string | undefined): this {
    if (value !== undefined) {
      this.countQuery = this.countQuery?.where(eq(column, value));
    }
    return super.filter(column, value);
  }

  search(column: SQLiteColumn, searchTerm: string | undefined): this {
    if (searchTerm !== undefined) {
      this.countQuery = this.countQuery?.where(ilike(column, `%${searchTerm}%`));
    }
    return super.search(column, searchTerm);
  }

  notNull(column: SQLiteColumn): this {
    this.countQuery = this.countQuery?.where(isNotNull(column));
    return super.notNull(column);
  }

  lastNDays(column: SQLiteColumn, days: number | undefined): this {
    if (days !== undefined && days > 0) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - days);
      this.countQuery = this.countQuery?.where(gte(column, daysAgo));
    }
    return super.lastNDays(column, days);
  }

  async getPaginatedResult() {
    const offset = (this.page - 1) * this.limit;
    const items = await this.query.limit(this.limit).offset(offset);

    const [{ count: total }] = (await this.countQuery) as { count: number }[];

    return {
      items,
      meta: {
        total,
        page: this.page,
        limit: this.limit,
        totalPages: Math.ceil(total / this.limit),
      },
    };
  }
}
