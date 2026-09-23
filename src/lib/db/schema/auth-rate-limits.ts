import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

// Limitare de rată pe rutele de autentificare (/login, /signup,
// /forgot-password) — înainte de orice sesiune/organizație, deci nu poate
// folosi crm_kv (are FK NOT NULL pe org_id). `identificator` e IP-ul
// clientului sau (la forgot-password) adresa de email țintă — vezi
// src/lib/auth/rate-limit.ts. Fereastră fixă: un singur UPSERT atomic
// (INSERT ... ON CONFLICT ... DO UPDATE) evită race condition-uri între
// cereri concurente, fără SELECT-then-UPDATE.
export const authRateLimits = pgTable(
  "auth_rate_limits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actiune: text("actiune").notNull(),
    identificator: text("identificator").notNull(),
    incercari: integer("incercari").default(1).notNull(),
    fereastraStart: timestamp("fereastra_start", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("auth_rate_limits_actiune_identificator_idx").on(table.actiune, table.identificator)],
).enableRLS();
