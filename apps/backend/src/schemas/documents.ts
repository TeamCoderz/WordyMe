import crypto from "node:crypto";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const documentsTable = sqliteTable("documents", {
  id: text().primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text().notNull(),
});
