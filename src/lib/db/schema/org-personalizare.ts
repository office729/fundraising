import { boolean, date, integer, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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

// Registrul de timp pentru munca custom și suportul unei organizații (vezi documentation/personalizare-organizatie.sql și lib/timp-custom.ts). Scris doar de echipa
// platformei; membrii îl citesc doar dacă pagina „Timp alocat” e activată pentru organizație. Un timer pornit are pornit_la setat și minute null.
export const orgTimp = pgTable("org_timp", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  // Vechi („claude” / „echipa”): timpul e acum al echipei, iar munca cu asistență AI se marchează în cu_ai. Coloana rămâne doar ca să nu se piardă istoricul; nu se mai citește.
  executant: text("executant").default("echipa"),
  cuAi: boolean("cu_ai").notNull().default(false),
  categorie: text("categorie").notNull(),
  descriere: text("descriere").notNull(),
  minute: integer("minute"),
  data: date("data", { mode: "string" }).notNull().defaultNow(),
  pornitLa: timestamp("pornit_la", { withTimezone: true }),
  opritLa: timestamp("oprit_la", { withTimezone: true }),
  creatDe: uuid("creat_de").references(() => appUsers.id, { onDelete: "set null" }),
  creatLa: timestamp("creat_la", { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

// Tariful pe oră al timpului echipei: doar echipa platformei, clientul nu îl vede niciodată. Tariful unic e în tarif_echipa; tarif_claude e vechi și rămâne 0.
export const orgTimpTarife = pgTable("org_timp_tarife", {
  orgId: uuid("org_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  tarifClaude: numeric("tarif_claude", { precision: 10, scale: 2 }).notNull().default("0"),
  tarifEchipa: numeric("tarif_echipa", { precision: 10, scale: 2 }).notNull().default("0"),
  moneda: text("moneda").notNull().default("RON"),
  actualizatLa: timestamp("actualizat_la", { withTimezone: true }).defaultNow().notNull(),
  actualizatDe: uuid("actualizat_de").references(() => appUsers.id, { onDelete: "set null" }),
}).enableRLS();
