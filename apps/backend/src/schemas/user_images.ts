import crypto from "node:crypto";
import { integer, sqliteTable, text, real } from "drizzle-orm/sqlite-core";
import { enumType } from "../utils/drizzle.js";
import { relations } from "drizzle-orm";
import { users } from "./auth.js";

export const userImagesTable = sqliteTable("user_images", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  created_at: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updated_at: integer("updatedAt", { mode: "timestamp_ms" }),
  images_type: enumType(["avatar", "cover"] as const),
  path: text("path"),
  zoom: real("zoom"),
  height: integer("height"),
  width: integer("width"),
  x: integer("x"),
  y: integer("y"),
  user_id: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
});

export const userImageRelations = relations(userImagesTable, ({ one }) => ({
  user: one(users, {
    fields: [userImagesTable.user_id],
    references: [users.id],
  }),
}));
