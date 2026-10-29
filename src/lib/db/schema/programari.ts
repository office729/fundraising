import { boolean, check, date, index, integer, jsonb, pgTable, smallint, text, time, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { organizations } from "./organizations";

// Calendarul intern de programări (documentation/programari.sql): tabele ale platformei, fără org_id. Le citește public doar codul serverului după validare
// (app.programari_public) și le administrează doar echipa platformei (app.platform_admin).

export const programariConfig = pgTable("programari_config", {
  id: integer("id").primaryKey().default(1),
  config: jsonb("config").notNull().default({}),
  actualizatLa: timestamp("actualizat_la", { withTimezone: true }).notNull().defaultNow(),
  actualizatDe: text("actualizat_de"),
}).enableRLS();

export const programariTipuri = pgTable("programari_tipuri", {
  id: uuid("id").defaultRandom().primaryKey(),
  titlu: text("titlu").notNull(),
  descriere: text("descriere"),
  durataMin: integer("durata_min").notNull(),
  locatie: text("locatie"),
  activ: boolean("activ").notNull().default(true),
  ordine: integer("ordine").notNull().default(0),
  creatLa: timestamp("creat_la", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

export const programariDisponibilitate = pgTable("programari_disponibilitate", {
  id: uuid("id").defaultRandom().primaryKey(),
  zi: smallint("zi").notNull(),
  deLa: time("de_la").notNull(),
  panaLa: time("pana_la").notNull(),
}).enableRLS();

export const programariExceptii = pgTable(
  "programari_exceptii",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    data: date("data", { mode: "string" }).notNull(),
    tip: text("tip").notNull(), // liber | program
    deLa: time("de_la"),
    panaLa: time("pana_la"),
    nota: text("nota"),
    creatLa: timestamp("creat_la", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("programari_exceptii_data_idx").on(t.data)],
).enableRLS();

export const programari = pgTable(
  "programari",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tipId: uuid("tip_id").references(() => programariTipuri.id, { onDelete: "set null" }),
    tipTitlu: text("tip_titlu").notNull(),
    durataMin: integer("durata_min").notNull(),
    locatie: text("locatie"),
    startLa: timestamp("start_la", { withTimezone: true }).notNull(),
    sfarsitLa: timestamp("sfarsit_la", { withTimezone: true }).notNull(),
    nume: text("nume").notNull(),
    email: text("email").notNull(),
    telefon: text("telefon"),
    organizatie: text("organizatie"),
    mesaj: text("mesaj"),
    stare: text("stare").notNull().default("confirmata"), // confirmata | anulata | efectuata
    token: text("token").notNull().unique(),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "set null" }),
    sursa: text("sursa"),
    creatLa: timestamp("creat_la", { withTimezone: true }).notNull().defaultNow(),
    anulatLa: timestamp("anulat_la", { withTimezone: true }),
    anulatDe: text("anulat_de"),
  },
  (t) => [index("programari_start_idx").on(t.startLa), index("programari_stare_idx").on(t.stare, t.startLa), check("programari_sfarsit_chk", sql`${t.sfarsitLa} > ${t.startLa}`)],
).enableRLS();
