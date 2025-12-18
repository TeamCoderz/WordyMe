import { eq, ilike } from "drizzle-orm";
import { SQLiteColumn, SQLiteSelect } from "drizzle-orm/sqlite-core";
import { PaginationQuery } from "../schemas/pagination.js";

export class CollectionQuery<Q extends SQLiteSelect> {
  query: Q;

  constructor(query: Q) {
    this.query = query;
  }

  filter(column: SQLiteColumn, value: string | undefined) {
    if (value !== undefined) {
      this.query = this.query.where(eq(column, value));
    }
    return this;
  }

  search(column: SQLiteColumn, searchTerm: string | undefined) {
    if (searchTerm !== undefined) {
      this.query = this.query.where(ilike(column, `%${searchTerm}%`));
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
      this.countQuery = this.countQuery?.where(
        ilike(column, `%${searchTerm}%`),
      );
    }
    return super.search(column, searchTerm);
  }

  async getPaginatedResult() {
    const items = await this.query;

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

// Usage example:

// const query = new CollectionQuery(db.select().from(documentsTable).$dynamic())
//     .filter(documentsTable.userId, "user-123")
//     .filter(documentsTable.handle, "my-handle");

// const results = await query.getResult(); // Row[]

// const paginatedCollectionQuery = new PaginatedCollectionQuery(
//     db.select().from(documentsTable).$dynamic(),
//     db.select({ count: count() }).from(documentsTable).$dynamic(),
//     { page: 2, limit: 10 },
// )
//     .filter(documentsTable.userId, "user-123")
//     .search(documentsTable.name, "report");

// const paginatedResults = await paginatedCollectionQuery.getPaginatedResult(); // PaginatedResult<Row>
