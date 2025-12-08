import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const documentsTable = sqliteTable("documents", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
});
