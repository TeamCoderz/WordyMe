import crypto from "node:crypto";
import {
  SQLiteColumn,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { enumType } from "../utils/drizzle.js";
import { users } from "./auth.js";
import { revisionsTable } from "./revisions.js";
import { relations } from "drizzle-orm";

export const documentsTable = sqliteTable("documents", {
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
  name: text("name").notNull(),
  handle: text("handle").notNull(),
  icon: text("icon"),
  position: text("position"),
  currentRevisionId: text("current_revision_id").references(
    (): SQLiteColumn => revisionsTable.id,
    {
      onDelete: "cascade",
      onUpdate: "cascade",
    }
  ),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  parentId: text("parent_id").references(
    (): SQLiteColumn => documentsTable.id,
    {
      onDelete: "cascade",
      onUpdate: "cascade",
    }
  ),
  documentType: enumType(["space", "folder", "note"] as const, "document_type")
    .notNull()
    .default("note"),
  spaceId: text("space_id").references(
    (): SQLiteColumn => documentsTable.id,
    {
      onDelete: "cascade",
      onUpdate: "cascade",
    }
  ),
  isContainer: integer("is_container", { mode: "boolean" })
    .notNull()
    .default(false),
  clientId: text("client_id"),
});

export const documentRelations = relations(documentsTable, ({ one, many }) => ({
  user: one(users, {
    fields: [documentsTable.userId],
    references: [users.id],
  }),
  currentRevision: one(revisionsTable, {
    fields: [documentsTable.currentRevisionId],
    references: [revisionsTable.id],
  }),
  parent: one(documentsTable, {
    fields: [documentsTable.parentId],
    references: [documentsTable.id],
    relationName: "parent",
  }),
  space: one(documentsTable, {
    fields: [documentsTable.spaceId],
    references: [documentsTable.id],
    relationName: "space",
  }),
  revisions: many(revisionsTable),
}));
