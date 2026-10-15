import { bigint, date, index, integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { appUsers } from "./app-users";
import { fundraisingDonations } from "./fundraising-pages";
import { organizations } from "./organizations";

// Performanța reclamelor: costuri, legătura campanie publicitară ↔ cod UTM, contextul de atribuire al donațiilor și istoricul linkurilor.
// Toate au org_id + RLS de izolare pe organizație. SQL-ul e în documentation/reclame.sql.

export const reclameCosturi = pgTable(
  "reclame_costuri",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    platforma: text("platforma").notNull(),
    ziua: date("ziua", { mode: "string" }).notNull(),
    cont: text("cont").notNull().default(""),
    campanieCheie: text("campanie_cheie").notNull().default(""),
    campanieNume: text("campanie_nume").notNull().default(""),
    setCheie: text("set_cheie").notNull().default(""),
    setNume: text("set_nume").notNull().default(""),
    reclamaCheie: text("reclama_cheie").notNull().default(""),
    reclamaNume: text("reclama_nume").notNull().default(""),
    plasament: text("plasament").notNull().default(""),
    moneda: text("moneda").notNull().default("RON"),
    cheltuialaMinor: bigint("cheltuiala_minor", { mode: "number" }).notNull(),
    cursRon: numeric("curs_ron", { precision: 14, scale: 6 }).notNull().default("1"),
    cheltuialaRonMinor: bigint("cheltuiala_ron_minor", { mode: "number" }).notNull(),
    afisari: bigint("afisari", { mode: "number" }),
    clicuriLink: bigint("clicuri_link", { mode: "number" }),
    sursa: text("sursa").notNull().default("import"),
    lotId: uuid("lot_id"),
    actualizatLa: timestamp("actualizat_la", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("reclame_costuri_cheie_uniq").on(t.orgId, t.platforma, t.ziua, t.cont, t.campanieCheie, t.setCheie, t.reclamaCheie, t.plasament),
    index("reclame_costuri_org_zi_idx").on(t.orgId, t.ziua),
  ],
).enableRLS();

export const reclameCampanii = pgTable(
  "reclame_campanii",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    platforma: text("platforma").notNull(),
    campanieCheie: text("campanie_cheie").notNull(),
    campanieNume: text("campanie_nume").notNull().default(""),
    utmCampanie: text("utm_campanie"),
    creatLa: timestamp("creat_la", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("reclame_campanii_uniq").on(t.orgId, t.platforma, t.campanieCheie), index("reclame_campanii_utm_idx").on(t.orgId, t.utmCampanie)],
).enableRLS();

export const reclameImporturi = pgTable(
  "reclame_importuri",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    platforma: text("platforma").notNull(),
    numeFisier: text("nume_fisier"),
    randuri: integer("randuri").notNull(),
    deLa: date("de_la", { mode: "string" }),
    panaLa: date("pana_la", { mode: "string" }),
    moneda: text("moneda").notNull().default("RON"),
    cursRon: numeric("curs_ron", { precision: 14, scale: 6 }).notNull().default("1"),
    totalRonMinor: bigint("total_ron_minor", { mode: "number" }).notNull().default(0),
    creatDe: uuid("creat_de").references(() => appUsers.id, { onDelete: "set null" }),
    creatLa: timestamp("creat_la", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reclame_importuri_org_idx").on(t.orgId, t.creatLa)],
).enableRLS();

export const donatieAtribuiri = pgTable(
  "donatie_atribuiri",
  {
    donatieId: uuid("donatie_id").primaryKey().references(() => fundraisingDonations.id, { onDelete: "cascade" }),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    clasa: text("clasa").notNull(), // platita | organica | email | alta
    platforma: text("platforma"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    utmContent: text("utm_content"),
    clickLa: timestamp("click_la", { withTimezone: true }),
    consimtamant: text("consimtamant").notNull().default("fara-stocare"),
    model: text("model").notNull().default("ultim-clic-v1"),
    creatLa: timestamp("creat_la", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("donatie_atribuiri_org_idx").on(t.orgId, t.clasa, t.creatLa), index("donatie_atribuiri_campanie_idx").on(t.orgId, t.utmCampaign)],
).enableRLS();

export const reclameLinkuri = pgTable(
  "reclame_linkuri",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    utmSource: text("utm_source").notNull(),
    utmMedium: text("utm_medium").notNull(),
    utmCampaign: text("utm_campaign").notNull(),
    utmContent: text("utm_content"),
    eticheta: text("eticheta"),
    creatDe: uuid("creat_de").references(() => appUsers.id, { onDelete: "set null" }),
    creatLa: timestamp("creat_la", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reclame_linkuri_org_idx").on(t.orgId, t.creatLa)],
).enableRLS();
