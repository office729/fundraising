import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { organizations } from "./organizations";

// KV mic pentru starea ne-relațională a CRM PJ (sarcini + config), per
// organizație — blob JSON, ca în SOI_CRM, dar cheia devine (org_id, path)
// în loc de path global.
export const crmKv = pgTable(
  "crm_kv",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    data: jsonb("data"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex("crm_kv_org_path_unique").on(t.orgId, t.path),
    index("crm_kv_org_idx").on(t.orgId),
  ],
).enableRLS();
