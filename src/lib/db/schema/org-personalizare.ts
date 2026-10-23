import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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

// Notiță internă a echipei platformei despre ce diferă la o organizație (vezi documentation/personalizare-organizatie.sql). Tabel separat, cu acces doar pentru echipa
// platformei: nici măcar un membru al organizației nu o poate citi, iar aplicația organizației nu o selectează niciodată.
export const orgPersonalizareNote = pgTable("org_personalizare_note", {
  orgId: uuid("org_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  nota: text("nota").notNull().default(""),
  actualizatLa: timestamp("actualizat_la", { withTimezone: true }).defaultNow().notNull(),
  actualizatDe: uuid("actualizat_de").references(() => appUsers.id, { onDelete: "set null" }),
}).enableRLS();
