import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { appUsers } from "./app-users";
import { organizations } from "./organizations";

// Parcursuri automate pentru donatori (documentation/parcursuri-donatori.sql): configurarea fiecărui parcurs al organizației și jurnalul e-mailurilor trimise.
export const parcursuriDonatori = pgTable(
  "parcursuri_donatori",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    cheie: text("cheie").notNull(), // welcome | save | upgrade
    activ: boolean("activ").notNull().default(false),
    // Momentul activării: Welcome și Save se aplică doar donatorilor al căror eveniment e după el (nu se scrie către istoric).
    activDin: timestamp("activ_din", { withTimezone: true }),
    pasi: jsonb("pasi").$type<{ zile: number; subiect: string; corp: string; buton?: string }[]>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    updatedBy: uuid("updated_by").references(() => appUsers.id, { onDelete: "set null" }),
  },
  (t) => [uniqueIndex("parcursuri_donatori_org_cheie").on(t.orgId, t.cheie)],
).enableRLS();

// Un rând pe (organizație, parcurs, pas, adresă): revendică pasul ÎNAINTE de trimitere, deci două rulări simultane nu trimit de două ori; se trece la „trimis” după.
export const parcursuriTrimiteri = pgTable(
  "parcursuri_trimiteri",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    cheie: text("cheie").notNull(),
    pas: integer("pas").notNull(), // 1-based
    email: text("email").notNull(), // litere mici
    donatorId: uuid("donator_id"),
    stare: text("stare").notNull().default("in_curs"), // in_curs | trimis
    creatLa: timestamp("creat_la", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("parcursuri_trimiteri_unic").on(t.orgId, t.cheie, t.pas, t.email),
    index("parcursuri_trimiteri_org_idx").on(t.orgId, t.creatLa),
    index("parcursuri_trimiteri_email_idx").on(t.orgId, t.email, t.creatLa),
  ],
).enableRLS();
