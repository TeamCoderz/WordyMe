import crypto from "node:crypto";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { documentsTable } from "./documents.js";
import { relations } from "drizzle-orm";
import { users } from "./auth.js";

export const favoritesTable = sqliteTable("favorites", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  created_at: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updated_at: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
  deleted_at: integer("deletedAt", { mode: "timestamp_ms" }),
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

export const favoriteRelations = relations(favoritesTable, ({ one }) => ({
  user: one(users, {
    fields: [favoritesTable.user_id],
    references: [users.id],
  }),
  document: one(documentsTable, {
    fields: [favoritesTable.document_id],
    references: [documentsTable.id],
  }),
}));
