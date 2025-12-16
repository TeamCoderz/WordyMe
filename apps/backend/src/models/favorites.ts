import crypto from "node:crypto";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { documentsTable } from "./documents.js";
import { relations } from "drizzle-orm";
import { users } from "./auth.js";

export const favoritesTable = sqliteTable(
  "favorites",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
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
  },
  (table) => [
    uniqueIndex("favorites_user_document_unique").on(
      table.userId,
      table.documentId,
    ),
  ],
);

export const favoriteRelations = relations(favoritesTable, ({ one }) => ({
  user: one(users, {
    fields: [favoritesTable.userId],
    references: [users.id],
  }),
  document: one(documentsTable, {
    fields: [favoritesTable.documentId],
    references: [documentsTable.id],
  }),
}));
