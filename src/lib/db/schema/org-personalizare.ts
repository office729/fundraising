import { jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { appUsers } from "./app-users";
import { organizations } from "./organizations";

// Personalizarea dashboardului unei organizații (vezi documentation/personalizare-organizatie.sql și lib/personalizare-org.ts).
// Doar configurare, scrisă exclusiv de echipa platformei; membrii organizației o pot doar citi.
export const orgPersonalizare = pgTable("org_personalizare", {
  orgId: uuid("org_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  config: jsonb("config").notNull().default({}),
  actualizatLa: timestamp("actualizat_la", { withTimezone: true }).defaultNow().notNull(),
  actualizatDe: uuid("actualizat_de").references(() => appUsers.id, { onDelete: "set null" }),
}).enableRLS();
