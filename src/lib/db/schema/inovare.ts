import { boolean, index, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
    stare: text("stare").notNull().default("propus"), // propus | in_planificare | in_dezvoltare | finalizat | nu_acum
    efort: text("efort"), // scazut | mediu | mare
    raspunsEchipa: text("raspuns_echipa"),
    ascunsa: boolean("ascunsa").notNull().default(false),
    duplicatDin: uuid("duplicat_din"),
    creatLa: timestamp("creat_la", { withTimezone: true }).notNull().defaultNow(),
    actualizatLa: timestamp("actualizat_la", { withTimezone: true }).notNull().defaultNow(),
    finalizatLa: timestamp("finalizat_la", { withTimezone: true }),
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
  },
  (t) => [primaryKey({ columns: [t.propunereId, t.orgId] }), index("inovare_voturi_org_idx").on(t.orgId)],
).enableRLS();
