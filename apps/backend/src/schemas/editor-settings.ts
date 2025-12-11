import crypto from "node:crypto";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./auth.js";
import { relations } from "drizzle-orm";

export const editorSettingsTable = sqliteTable("editor_settings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  keepPreviousRevision: integer("keep_previous_revision", { mode: "boolean" })
    .notNull()
    .default(false),
  autosave: integer("autosave", { mode: "boolean" }).notNull().default(false),
});

export const editorSettingsRelations = relations(
  editorSettingsTable,
  ({ one }) => ({
    user: one(users, {
      fields: [editorSettingsTable.userId],
      references: [users.id],
    }),
  })
);
