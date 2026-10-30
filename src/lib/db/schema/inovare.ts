import { boolean, date, index, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { appUsers } from "./app-users";
import { organizations } from "./organizations";

// Centrul de inovare (documentation/inovare.sql): ideile ONG-urilor, voturile lor (unul pe organizație) și răspunsul echipei. Tabele ale platformei, nu ale unei
// organizații: ideile se văd între organizații, fără adrese de email și fără să se știe cine a votat. Citirea cere app.inovare_citire (setat de server după
// verificarea sesiunii); echipa platformei administrează cu app.platform_admin.
export const inovarePropuneri = pgTable(
  "inovare_propuneri",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => appUsers.id, { onDelete: "set null" }),
    autorNume: text("autor_nume"),
    orgNume: text("org_nume"),
    afiseazaOrganizatia: boolean("afiseaza_organizatia").notNull().default(true),
    titlu: text("titlu").notNull(),
    descriere: text("descriere").notNull(),
    cumFaciAcum: text("cum_faci_acum"),
    categorie: text("categorie").notNull(),
    stare: text("stare").notNull().default("propus"), // propus | vazuta | in_planificare | in_dezvoltare | finalizat | nu_acum
    efort: text("efort"), // scazut | mediu | mare
    raspunsEchipa: text("raspuns_echipa"),
    ascunsa: boolean("ascunsa").notNull().default(false),
    duplicatDin: uuid("duplicat_din"),
    creatLa: timestamp("creat_la", { withTimezone: true }).notNull().defaultNow(),
    actualizatLa: timestamp("actualizat_la", { withTimezone: true }).notNull().defaultNow(),
    finalizatLa: timestamp("finalizat_la", { withTimezone: true }),
    obiectiv: text("obiectiv"), // ce vrea ONG-ul să crească
    frecventa: text("frecventa"), // cât de des apare problema
    reevaluareLa: date("reevaluare_la"), // pentru „Nu acum”
    motivAscundere: text("motiv_ascundere"), // raportata | echipa | unita
    primulRaspunsLa: timestamp("primul_raspuns_la", { withTimezone: true }),
    organizatieSlug: text("organizatie_slug"),
  },
  (t) => [index("inovare_propuneri_stare_idx").on(t.stare, t.creatLa), index("inovare_propuneri_org_idx").on(t.orgId)],
).enableRLS();

export const inovareVoturi = pgTable(
  "inovare_voturi",
  {
    propunereId: uuid("propunere_id")
      .notNull()
      .references(() => inovarePropuneri.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => appUsers.id, { onDelete: "set null" }),
    creatLa: timestamp("creat_la", { withTimezone: true }).notNull().defaultNow(),
    organizatieSlug: text("organizatie_slug"),
  },
  (t) => [primaryKey({ columns: [t.propunereId, t.orgId] }), index("inovare_voturi_org_idx").on(t.orgId)],
).enableRLS();

// Istoricul schimbărilor de stare (scris doar de echipa platformei).
export const inovareEvenimente = pgTable(
  "inovare_evenimente",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propunereId: uuid("propunere_id")
      .notNull()
      .references(() => inovarePropuneri.id, { onDelete: "cascade" }),
    stareVeche: text("stare_veche"),
    stareNoua: text("stare_noua").notNull(),
    creatLa: timestamp("creat_la", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("inovare_evenimente_idee_idx").on(t.propunereId, t.creatLa)],
).enableRLS();

// Raportările altor organizații: ideea raportată se ascunde imediat, echipa o analizează.
export const inovareRaportari = pgTable(
  "inovare_raportari",
  {
    propunereId: uuid("propunere_id")
      .notNull()
      .references(() => inovarePropuneri.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => appUsers.id, { onDelete: "set null" }),
    motiv: text("motiv"),
    creatLa: timestamp("creat_la", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.propunereId, t.orgId] })],
).enableRLS();
