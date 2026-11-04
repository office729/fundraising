import { boolean, index, integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { appUsers } from "./app-users";
import { organizations } from "./organizations";

// AI pe contul organizației (documentation/ai-org.sql): consumul fiecărui apel către Claude și alegerile organizației (model, buget lunar).
export const aiConsum = pgTable(
  "ai_consum",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    instrument: text("instrument").notNull(),
    model: text("model").notNull(),
    tokeniIn: integer("tokeni_in").notNull().default(0),
    tokeniOut: integer("tokeni_out").notNull().default(0),
    tokeniCacheCitire: integer("tokeni_cache_citire").notNull().default(0),
    tokeniCacheScriere: integer("tokeni_cache_scriere").notNull().default(0),
    cautariWeb: integer("cautari_web").notNull().default(0),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6 }).notNull().default("0"),
    userId: uuid("user_id").references(() => appUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("ai_consum_org_idx").on(t.orgId, t.createdAt)],
).enableRLS();

export const aiSetari = pgTable("ai_setari", {
  orgId: uuid("org_id").primaryKey().references(() => organizations.id, { onDelete: "cascade" }),
  model: text("model"),
  bugetUsd: numeric("buget_usd", { precision: 10, scale: 2 }),
  povesteLaAi: boolean("poveste_la_ai").notNull().default(false),
  opresteLaBuget: boolean("opreste_la_buget").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();
