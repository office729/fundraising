import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { appUsers } from "./app-users";
import { organizations } from "./organizations";

// Câmpuri personalizate, chei API și webhook-uri (documentation/api-campuri.sql). Toate cu RLS forțat pe organizație.
export const campuriPersonalizate = pgTable(
  "campuri_personalizate",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    entitate: text("entitate").notNull(), // donator | companie
    cheie: text("cheie").notNull(),
    eticheta: text("eticheta").notNull(),
    tip: text("tip").notNull(), // text | numar | data | alegere | da_nu
    optiuni: jsonb("optiuni").$type<string[]>().notNull().default([]),
    ordine: integer("ordine").notNull().default(0),
    activ: boolean("activ").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("campuri_personalizate_unic").on(t.orgId, t.entitate, t.cheie)],
).enableRLS();

// Cheia întreagă nu se păstrează: doar hash-ul SHA-256 și un prefix pentru recunoaștere.
export const apiChei = pgTable(
  "api_chei",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    nume: text("nume").notNull(),
    prefix: text("prefix").notNull(),
    hash: text("hash").notNull(),
    scopuri: text("scopuri").array().notNull().default([]),
    creatDe: uuid("creat_de").references(() => appUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    ultimaFolosireLa: timestamp("ultima_folosire_la", { withTimezone: true }),
    revocataLa: timestamp("revocata_la", { withTimezone: true }),
  },
  (t) => [uniqueIndex("api_chei_hash_unic").on(t.hash), index("api_chei_org_idx").on(t.orgId, t.createdAt)],
).enableRLS();

export const webhookEndpointuri = pgTable(
  "webhook_endpointuri",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    secretEnc: text("secret_enc").notNull(), // criptat (lib/secret-box.ts)
    evenimente: text("evenimente").array().notNull().default([]),
    activ: boolean("activ").notNull().default(true),
    esecuriConsecutive: integer("esecuri_consecutive").notNull().default(0),
    dezactivatMotiv: text("dezactivat_motiv"),
    creatDe: uuid("creat_de").references(() => appUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("webhook_endpointuri_org_idx").on(t.orgId, t.createdAt)],
).enableRLS();

export const webhookLivrari = pgTable(
  "webhook_livrari",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    endpointId: uuid("endpoint_id").notNull().references(() => webhookEndpointuri.id, { onDelete: "cascade" }),
    eveniment: text("eveniment").notNull(),
    payload: jsonb("payload").notNull(),
    stare: text("stare").notNull().default("in_asteptare"), // in_asteptare | trimis | esuat
    incercari: integer("incercari").notNull().default(0),
    urmatoareaIncercareLa: timestamp("urmatoarea_incercare_la", { withTimezone: true }).notNull().defaultNow(),
    ultimulCod: integer("ultimul_cod"),
    ultimaEroare: text("ultima_eroare"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    trimisLa: timestamp("trimis_la", { withTimezone: true }),
  },
  (t) => [index("webhook_livrari_de_trimis_idx").on(t.stare, t.urmatoareaIncercareLa), index("webhook_livrari_org_idx").on(t.orgId, t.createdAt)],
).enableRLS();
