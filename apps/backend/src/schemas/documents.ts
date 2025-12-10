import crypto from "node:crypto";
import {
  AnySQLiteColumn,
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
  created_at: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updated_at: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
  name: text("name").notNull(),
  handle: text("handle").notNull(),
  icon: text("icon"),
  position: text("position"),
  currentRevisionId: text("currentRevisionId").references(
    (): AnySQLiteColumn => revisionsTable.id,
    {
      onDelete: "cascade",
      onUpdate: "cascade",
    }
  ),
  userId: text("userId")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  parentId: text("parentId").references(
    (): AnySQLiteColumn => documentsTable.id,
    {
      onDelete: "cascade",
      onUpdate: "cascade",
    }
  ),
  document_type: enumType(["space", "folder", "note"] as const)
    .notNull()
    .default("note"),
  spaceId: text("spaceId").references(
    (): AnySQLiteColumn => documentsTable.id,
    {
      onDelete: "cascade",
      onUpdate: "cascade",
    }
  ),
  deletedAt: integer("deletedAt", { mode: "timestamp_ms" }),
  isContainer: integer("isContainer", { mode: "boolean" })
    .notNull()
    .default(false),
  clientId: text("clientId"),
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
