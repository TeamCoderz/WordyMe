import crypto from "node:crypto";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./auth.js";
import { documentsTable } from "./documents.js";
import { relations } from "drizzle-orm";

export const documentViewsTable = sqliteTable("document_views", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  lastViewedAt: integer("last_viewed_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  documentId: text("document_id")
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
      fields: [documentViewsTable.userId],
      references: [users.id],
    }),
    document: one(documentsTable, {
      fields: [documentViewsTable.documentId],
      references: [documentsTable.id],
    }),
  })
);
