import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, jsonb, pgTable, primaryKey, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { appUsers } from "./app-users";
import { fundraisingPages } from "./fundraising-pages";
import { organizations } from "./organizations";

// Modulul Influenceri (documentation/influenceri.sql, regulile în lib/influenceri/reguli.ts). Toate tabelele au org_id + RLS forțat.

export const influenceri = pgTable(
  "influenceri",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    nume: text("nume"),
    numePublic: text("nume_public").notNull(),
    fotoUrl: text("foto_url"),
    facebook: text("facebook"),
    instagram: text("instagram"),
    tiktok: text("tiktok"),
    youtube: text("youtube"),
    // Formele normalizate (handle / id / email): baza indexurilor unice anti-dubluri.
    facebookNorm: text("facebook_norm"),
    instagramNorm: text("instagram_norm"),
    tiktokNorm: text("tiktok_norm"),
    youtubeNorm: text("youtube_norm"),
    emailNorm: text("email_norm"),
    urmaritori: jsonb("urmaritori").$type<Record<string, number>>().notNull().default({}),
    categorie: text("categorie").notNull().default("lifestyle"),
    domeniu: text("domeniu"),
    publicTinta: text("public_tinta"),
    oras: text("oras"),
    judet: text("judet"),
    tara: text("tara").notNull().default("România"),
    email: text("email"),
    telefon: text("telefon"),
    sursaDate: text("sursa_date").notNull().default("manual"),
    temeiLegal: text("temei_legal").notNull().default("interes legitim — profil public, contact profesional"),
    responsabilId: uuid("responsabil_id").references(() => appUsers.id, { onDelete: "set null" }),
    etapa: text("etapa").notNull().default("identificat"),
    cazId: uuid("caz_id").references(() => fundraisingPages.id, { onDelete: "set null" }),
    note: text("note"),
    nuContacta: boolean("nu_contacta").notNull().default(false),
    nuContactaMotiv: text("nu_contacta_motiv"),
    ultimaContactare: timestamp("ultima_contactare", { withTimezone: true }),
    ultimulRaspuns: timestamp("ultimul_raspuns", { withTimezone: true }),
    followUpLa: timestamp("follow_up_la", { withTimezone: true }),
    followUpTip: text("follow_up_tip"),
    followUpNota: text("follow_up_nota"),
    nrReveniri: integer("nr_reveniri").notNull().default(0),
    acordPublic: boolean("acord_public").notNull().default(false),
    createdBy: uuid("created_by").references(() => appUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("influenceri_instagram_unic").on(t.orgId, t.instagramNorm).where(sql`${t.instagramNorm} is not null`),
    uniqueIndex("influenceri_facebook_unic").on(t.orgId, t.facebookNorm).where(sql`${t.facebookNorm} is not null`),
    uniqueIndex("influenceri_tiktok_unic").on(t.orgId, t.tiktokNorm).where(sql`${t.tiktokNorm} is not null`),
    uniqueIndex("influenceri_youtube_unic").on(t.orgId, t.youtubeNorm).where(sql`${t.youtubeNorm} is not null`),
    uniqueIndex("influenceri_email_unic").on(t.orgId, t.emailNorm).where(sql`${t.emailNorm} is not null`),
    index("influenceri_etapa_idx").on(t.orgId, t.etapa),
    index("influenceri_responsabil_idx").on(t.orgId, t.responsabilId),
    index("influenceri_followup_idx").on(t.orgId, t.followUpLa).where(sql`${t.followUpLa} is not null`),
    index("influenceri_creat_idx").on(t.orgId, t.createdBy, t.createdAt),
    index("influenceri_judet_idx").on(t.orgId, t.judet),
    check("influenceri_nr_reveniri_check", sql`${t.nrReveniri} >= 0`),
  ],
).enableRLS();

// Istoricul fișei = jurnal de audit (nu se editează; se șterge doar odată cu fișa, la cerere).
export const influenceriActivitati = pgTable(
  "influenceri_activitati",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    influencerId: uuid("influencer_id").notNull().references(() => influenceri.id, { onDelete: "cascade" }),
    tip: text("tip").notNull(),
    canal: text("canal"),
    text: text("text"),
    cazId: uuid("caz_id").references(() => fundraisingPages.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => appUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("influenceri_activitati_inf_idx").on(t.influencerId, t.createdAt.desc()), index("influenceri_activitati_org_idx").on(t.orgId, t.tip, t.createdAt)],
).enableRLS();

// Un link unic pentru fiecare influencer × campanie × platformă. `slug` = /r/<slug> și utm_campaign la donație; fără numele persoanei.
export const influenceriLinkuri = pgTable(
  "influenceri_linkuri",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    influencerId: uuid("influencer_id").references(() => influenceri.id, { onDelete: "set null" }),
    cazId: uuid("caz_id").notNull().references(() => fundraisingPages.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    platforma: text("platforma").notNull(),
    descriere: text("descriere"),
    createdBy: uuid("created_by").references(() => appUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("influenceri_linkuri_slug_unic").on(t.slug),
    uniqueIndex("influenceri_linkuri_inf_unic").on(t.influencerId, t.cazId, t.platforma).where(sql`${t.influencerId} is not null`),
    index("influenceri_linkuri_org_idx").on(t.orgId, t.cazId),
  ],
).enableRLS();

// Clicuri pe zi (doar numărul, fără IP sau alt identificator).
export const influenceriClicuri = pgTable(
  "influenceri_clicuri",
  {
    linkId: uuid("link_id").notNull().references(() => influenceriLinkuri.id, { onDelete: "cascade" }),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    ziua: date("ziua", { mode: "string" }).notNull(),
    nr: integer("nr").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.linkId, t.ziua] }), index("influenceri_clicuri_org_idx").on(t.orgId, t.ziua)],
).enableRLS();

// Amprentele (hash) handle-urilor și emailurilor care nu mai trebuie readăugate după „ștergere la cerere” sau „nu mai contactăm”.
export const influenceriExcluderi = pgTable(
  "influenceri_excluderi",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    amprenta: text("amprenta").notNull(),
    motiv: text("motiv").notNull().default("stergere"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("influenceri_excluderi_org_id_amprenta_key").on(t.orgId, t.amprenta)],
).enableRLS();
