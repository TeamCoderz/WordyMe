import crypto from "node:crypto";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { documentsTable } from "./documents.js";
import { relations } from "drizzle-orm";
import { users } from "./auth.js";

export const revisionsTable = sqliteTable("revisions", {
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
  documentId: text("document_id")
    .notNull()
    .references(() => documentsTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  revisionName: text("revision_name"),
  contentPath: text("content_path").notNull(),
  text: text("text").notNull(),
  checksum: text("checksum"),
});

export const revisionRelations = relations(revisionsTable, ({ one }) => ({
  document: one(documentsTable, {
    fields: [revisionsTable.documentId],
    references: [documentsTable.id],
  }),
  user: one(users, {
    fields: [revisionsTable.userId],
    references: [users.id],
  }),
}));
