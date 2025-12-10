import crypto from "node:crypto";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const deploymentsTable = sqliteTable("deployments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  deployed_at: integer("deployedAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  deployment_id: text("deploymentId"),
  commit_sha: text("commitSha"),
  status: text("status"),
  version_number: text("versionNumber").default("1.0.0"),
  created_at: integer("createdAt", { mode: "timestamp_ms" }),
});
