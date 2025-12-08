import crypto from "node:crypto";
import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import { enumType } from "../utils/drizzle.js";

export const feedbacksTable = sqliteTable("feedbacks", {
  id: text().primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: text().notNull(),
  app_version: text().notNull().default("1.0.0"),
  content: text(),
  rating: real().notNull().default(2.5),
  feedback_type: enumType(['issue', 'user-experience', 'feature-request', 'general'] as const),
  reviewed_at: integer({ mode: "timestamp_ms" }),
  created_at: integer({ mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updated_at: integer({ mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});
