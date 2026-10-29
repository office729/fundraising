import { boolean, date, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { formular230Beneficiari } from "./formular230";
import { fundraisingPages } from "./fundraising-pages";
import { organizations } from "./organizations";

// Provenința vizitatorilor și atribuirea conversiilor (documentation/atribuire.sql, regulile în documentation/atribuire.md).
// org_id null = site-ul platformei (înscrierea ONG-urilor); vizibil doar echipei platformei.

// Un rând = un eveniment al unui vizitator pe o pagină publică. Cu acordul pentru statistici, vizitator_id și sesiune_id sunt UUID-uri pseudonime din browser;
// fără acord sunt o amprentă zilnică (persistent = false). Clasificarea provenienței se calculează pe server și se repetă pe fiecare eveniment al sesiunii.
export const atribEvenimente = pgTable(
  "atrib_evenimente",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    flux: text("flux").notNull(), // campanie | f230 | sponsorizare20 | platforma
    tip: text("tip").notNull(), // vizita | click_doneaza | start_donatie | start_formular | lead | inscriere_pornita
    pageId: uuid("page_id").references(() => fundraisingPages.id, { onDelete: "cascade" }),
    beneficiarId: uuid("beneficiar_id").references(() => formular230Beneficiari.id, { onDelete: "set null" }),
    vizitatorId: text("vizitator_id").notNull(),
    persistent: boolean("persistent").notNull().default(false),
    sesiuneId: text("sesiune_id").notNull(),
    sursa: text("sursa").notNull(),
    canal: text("canal").notNull(),
    tipPromovare: text("tip_promovare").notNull(), // organic | platit | nedeterminat
    metoda: text("metoda").notNull(), // utm | identificator_reclame | referrer | necunoscut
    campanieMarketing: text("campanie_marketing"),
    continut: text("continut"),
    termen: text("termen"),
    utmId: text("utm_id"),
    adClickTip: text("ad_click_tip"),
    adClickId: text("ad_click_id"),
    referrerHost: text("referrer_host"),
    cale: text("cale"),
    dispozitiv: text("dispozitiv").notNull().default("desktop"),
    la: timestamp("la", { withTimezone: true }).notNull().defaultNow(),
    ziua: date("ziua", { mode: "string" }).notNull(),
  },
  (t) => [
    index("atrib_evenimente_org_ziua_idx").on(t.orgId, t.ziua),
    index("atrib_evenimente_vizitator_idx").on(t.orgId, t.vizitatorId, t.la),
    index("atrib_evenimente_page_ziua_idx").on(t.pageId, t.ziua),
    index("atrib_evenimente_ziua_idx").on(t.ziua),
  ],
).enableRLS();

// Instantaneul de atribuire al unei conversii, salvat în clipa conversiei și neschimbat de vizitele ulterioare.
// Rezultatul real (confirmat, rambursat, suma) se citește din tabelul operațional al conversiei; aici e doar proveniența.
export const atribConversii = pgTable(
  "atrib_conversii",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    tip: text("tip").notNull(), // donatie | f230 | lead | cont
    entitateId: uuid("entitate_id").notNull(),
    flux: text("flux").notNull(),
    pageId: uuid("page_id"),
    beneficiarId: uuid("beneficiar_id"),
    vizitatorId: text("vizitator_id"),
    sesiuneId: text("sesiune_id"),
    persistent: boolean("persistent").notNull().default(false),
    consimtamant: text("consimtamant").notNull().default("fara-stocare"), // acord-statistici | fara-stocare
    model: text("model").notNull(),
    fereastraZile: integer("fereastra_zile").notNull(),
    conversieLa: timestamp("conversie_la", { withTimezone: true }).notNull().defaultNow(),
    primaSursa: text("prima_sursa"),
    primaCanal: text("prima_canal"),
    primaTip: text("prima_tip"),
    primaMetoda: text("prima_metoda"),
    primaCampanie: text("prima_campanie"),
    primaContinut: text("prima_continut"),
    primaLa: timestamp("prima_la", { withTimezone: true }),
    sesSursa: text("ses_sursa"),
    sesCanal: text("ses_canal"),
    sesTip: text("ses_tip"),
    sesMetoda: text("ses_metoda"),
    sesCampanie: text("ses_campanie"),
    sesContinut: text("ses_continut"),
    ultSursa: text("ult_sursa"),
    ultCanal: text("ult_canal"),
    ultTip: text("ult_tip"),
    ultMetoda: text("ult_metoda"),
    ultCampanie: text("ult_campanie"),
    ultContinut: text("ult_continut"),
    ultLa: timestamp("ult_la", { withTimezone: true }),
    creatLa: timestamp("creat_la", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("atrib_conversii_entitate_uniq").on(t.tip, t.entitateId),
    index("atrib_conversii_org_idx").on(t.orgId, t.tip, t.conversieLa),
    index("atrib_conversii_page_idx").on(t.orgId, t.pageId),
    index("atrib_conversii_vizitator_idx").on(t.orgId, t.vizitatorId),
  ],
).enableRLS();
