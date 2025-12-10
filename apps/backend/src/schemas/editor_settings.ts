import crypto from "node:crypto";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./auth.js";
import { relations } from "drizzle-orm";

export const editorSettingsTable = sqliteTable("editor_settings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  created_at: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  user_id: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  keep_previous_revision: integer("keepPreviousRevision", { mode: "boolean" })
    .notNull()
    .default(false),
  autosave: integer("autosave", { mode: "boolean" }).notNull().default(false),
});

export const editorSettingsRelations = relations(
  editorSettingsTable,
  ({ one }) => ({
    user: one(users, {
      fields: [editorSettingsTable.user_id],
      references: [users.id],
    }),
  })
);
