import crypto from "node:crypto";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { documentsTable } from "./documents.js";
import { relations } from "drizzle-orm";
import { users } from "./auth.js";

export const revisionsTable = sqliteTable("revisions", {
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
  document_id: text("documentId")
    .notNull()
    .references(() => documentsTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  user_id: text("userId")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  revision_name: text("revisionName"),
  content_path: text("contentPath").notNull(),
  text: text("text").notNull(),
  checksum: text("checksum"),
});

export const revisionRelations = relations(revisionsTable, ({ one }) => ({
  document: one(documentsTable, {
    fields: [revisionsTable.document_id],
    references: [documentsTable.id],
  }),
  user: one(users, {
    fields: [revisionsTable.user_id],
    references: [users.id],
  }),
}));
