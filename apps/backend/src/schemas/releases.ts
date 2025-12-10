import crypto from "node:crypto";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const releasesTable = sqliteTable("releases", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  created_at: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  version_number: text("versionNumber").notNull(),
  commit_sha: text("commitSha").notNull(),
  deployment_id: text("deploymentId"),
  release_tag: text("releaseTag").notNull(),
  release_notes: text("releaseNotes"),
});
