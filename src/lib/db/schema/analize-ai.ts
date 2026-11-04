import { date, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { appUsers } from "./app-users";
import { organizations } from "./organizations";

// Analizele cu AI pe contul organizației (documentation/analize-ai.sql): reclame (săptămânal + manual) și ONG-uri (căutare web, în fundal).

export const analizeReclame = pgTable(
  "analize_reclame",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    stare: text("stare").notNull().default("in_lucru"), // in_lucru | gata | eroare
    sursa: text("sursa").notNull().default("manual"), // manual | cron
    // Luni (ora României) a săptămânii analizate — doar pentru cron, ca rularea să fie idempotentă.
    saptamana: date("saptamana", { mode: "string" }),
    perioadaDe: date("perioada_de", { mode: "string" }).notNull(),
    perioadaPana: date("perioada_pana", { mode: "string" }).notNull(),
    model: text("model"),
    rezultat: jsonb("rezultat"),
    dateSumar: jsonb("date_sumar"),
    eroare: text("eroare"),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6 }).notNull().default("0"),
    creatDe: uuid("creat_de").references(() => appUsers.id, { onDelete: "set null" }),
    creatLa: timestamp("creat_la", { withTimezone: true }).notNull().defaultNow(),
    actualizatLa: timestamp("actualizat_la", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("analize_reclame_org_idx").on(t.orgId, t.creatLa),
    uniqueIndex("analize_reclame_saptamana_uniq").on(t.orgId, t.saptamana).where(sql`${t.sursa} = 'cron'`),
  ],
).enableRLS();

export const analizeOng = pgTable(
  "analize_ong",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    nume: text("nume").notNull(),
    numeNorm: text("nume_norm").notNull(),
    site: text("site"),
    interes: text("interes"),
    stare: text("stare").notNull().default("in_lucru"), // in_lucru | gata | eroare
    raport: text("raport"),
    surse: jsonb("surse").notNull().default([]),
    model: text("model"),
    cautari: integer("cautari").notNull().default(0),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6 }).notNull().default("0"),
    eroare: text("eroare"),
    creatDe: uuid("creat_de").references(() => appUsers.id, { onDelete: "set null" }),
    creatLa: timestamp("creat_la", { withTimezone: true }).notNull().defaultNow(),
    terminatLa: timestamp("terminat_la", { withTimezone: true }),
  },
  (t) => [
    index("analize_ong_org_idx").on(t.orgId, t.creatLa),
    uniqueIndex("analize_ong_in_lucru_uniq").on(t.orgId, t.numeNorm).where(sql`${t.stare} = 'in_lucru'`),
  ],
).enableRLS();
