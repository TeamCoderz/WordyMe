import crypto from "node:crypto";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./auth.js";
import { documentsTable } from "./documents.js";
import { relations } from "drizzle-orm";

export const documentViewsTable = sqliteTable("document_views", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  created_at: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  last_viewed_at: integer("lastViewedAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  user_id: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  document_id: text("documentId")
    .notNull()
    .references(() => documentsTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
});

export const documentViewsRelations = relations(
  documentViewsTable,
  ({ one }) => ({
    user: one(users, {
      fields: [documentViewsTable.user_id],
      references: [users.id],
    }),
    document: one(documentsTable, {
      fields: [documentViewsTable.document_id],
      references: [documentsTable.id],
    }),
  })
);
