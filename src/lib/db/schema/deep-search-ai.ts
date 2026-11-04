import { integer, numeric, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { appUsers } from "./app-users";
import { companies } from "./companies";
import { organizations } from "./organizations";

// Memoria căutării „Caută pe internet (AI)” (documentation/deep-search-ai.sql): un rând pe firmă, valabil 30 de zile.
// Doar metadate; persoanele găsite stau în prospectare_candidati.
export const deepSearchAi = pgTable(
  "deep_search_ai",
  {
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => appUsers.id, { onDelete: "set null" }),
    gasiti: integer("gasiti").notNull().default(0),
    surse: integer("surse").notNull().default(0),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6 }).notNull().default("0"),
    model: text("model"),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.companyId] })],
).enableRLS();
