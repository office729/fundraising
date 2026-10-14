import { date, index, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { appUsers } from "./app-users";
import { organizations } from "./organizations";

// Granturi: registrul cererilor de finanțare ale organizației și „dosarul” ei standard, refolosibil la fiecare cerere.
// Ambele au org_id + RLS de izolare pe organizație (vezi scripts/restore-rls.mjs). SQL-ul e în documentation/granturi.sql.

export type ElementListaGrant = { text: string; ok: boolean };

export const granturi = pgTable(
  "granturi",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    finantator: text("finantator").notNull(),
    titlu: text("titlu").notNull(),
    tipFinantator: text("tip_finantator").notNull().default("alt"), // corporate | fundatie | ue | public | platforma | alt
    // Stările: identificat → in_pregatire → aplicat → castigat | respins → in_derulare → raportat (sau renuntat) — vezi lib/granturi/stari.ts
    stare: text("stare").notNull().default("identificat"),
    suma: numeric("suma", { precision: 14, scale: 2 }),
    moneda: text("moneda").notNull().default("RON"),
    termen: date("termen"), // termenul limită de depunere
    link: text("link"),
    responsabilId: uuid("responsabil_id").references(() => appUsers.id, { onDelete: "set null" }),
    nota: text("nota"),
    cerinte: text("cerinte"), // cerințele finanțatorului, lipite din ghid — sursa draftului
    eligibilitate: jsonb("eligibilitate").$type<ElementListaGrant[]>().notNull().default([]),
    documente: jsonb("documente").$type<ElementListaGrant[]>().notNull().default([]),
    draft: text("draft"),
    sumaCastigata: numeric("suma_castigata", { precision: 14, scale: 2 }),
    dataDecizie: date("data_decizie"),
    termenRaportare: date("termen_raportare"),
    reminder7zLa: timestamp("reminder_7z_la", { withTimezone: true }),
    reminder1zLa: timestamp("reminder_1z_la", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => appUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("granturi_org_termen_idx").on(t.orgId, t.termen)],
).enableRLS();

// Un singur dosar pe organizație: faptele care se repetă în orice cerere (identitate, misiune, cifre de impact, buget, contact).
export const granturiDosar = pgTable(
  "granturi_dosar",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    continut: jsonb("continut").$type<Record<string, string>>().notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("granturi_dosar_org_uniq").on(t.orgId)],
).enableRLS();
