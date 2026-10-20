import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { appUsers } from "./app-users";
import { organizations } from "./organizations";

// Acces de suport acordat de o organizație echipei platformei (vezi documentation/suport-acces.sql).
export const suportAcces = pgTable(
  "suport_acces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    acordatDe: uuid("acordat_de").references(() => appUsers.id, { onDelete: "set null" }),
    acordatLa: timestamp("acordat_la", { withTimezone: true }).defaultNow().notNull(),
    expiraLa: timestamp("expira_la", { withTimezone: true }).notNull(),
    retrasLa: timestamp("retras_la", { withTimezone: true }),
    retrasDe: uuid("retras_de").references(() => appUsers.id, { onDelete: "set null" }),
  },
  (t) => [index("suport_acces_org_idx").on(t.orgId, t.expiraLa)],
).enableRLS();

// Erori ale unei organizații, cu mesajul curățat de date personale (lib/suport/date-personale.ts).
export const eroriAplicatie = pgTable(
  "erori_aplicatie",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    zona: text("zona").notNull(),
    cod: text("cod"),
    mesaj: text("mesaj").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("erori_aplicatie_org_idx").on(t.orgId, t.createdAt)],
).enableRLS();
