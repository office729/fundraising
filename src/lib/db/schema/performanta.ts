import { boolean, date, index, integer, jsonb, numeric, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { appUsers } from "./app-users";
import { angajati, departments, kpiDefinitii } from "./kpi";
import { organizations } from "./organizations";

// Echipă & Performanță: obiective și rezultate-cheie, activități (planul săptămânii), blocaje, absențe, notificări.
// Se leagă de modulul KPI existent (angajati, departments, kpi_definitii). Toate tabelele au org_id + RLS de izolare.
// Valorile text cu set închis (nivel, status, metoda…) sunt validate prin CHECK în baza de date și prin tipurile din lib/performanta-masurare.ts.

export const obiective = pgTable(
  "obiective",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    nivel: text("nivel").notNull(), // strategic | echipa | individual
    titlu: text("titlu").notNull(),
    descriere: text("descriere"),
    responsabilId: uuid("responsabil_id").references(() => angajati.id, { onDelete: "set null" }),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    perioadaStart: date("perioada_start").notNull(),
    perioadaEnd: date("perioada_end").notNull(),
    status: text("status").notNull().default("activ"), // activ | finalizat | anulat
    motivAnulare: text("motiv_anulare"),
    vizibilitate: text("vizibilitate").notNull().default("organizatie"), // organizatie | echipa | privat
    creatDe: uuid("creat_de").references(() => appUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("obiective_org_idx").on(t.orgId, t.perioadaStart.desc()), index("obiective_responsabil_idx").on(t.orgId, t.responsabilId)],
).enableRLS();

export const obiectiveColaboratori = pgTable(
  "obiective_colaboratori",
  {
    obiectivId: uuid("obiectiv_id").notNull().references(() => obiective.id, { onDelete: "cascade" }),
    angajatId: uuid("angajat_id").notNull().references(() => angajati.id, { onDelete: "cascade" }),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.obiectivId, t.angajatId] })],
).enableRLS();

export const obiectiveLegaturi = pgTable(
  "obiective_legaturi",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    obiectivId: uuid("obiectiv_id").notNull().references(() => obiective.id, { onDelete: "cascade" }),
    legatDeId: uuid("legat_de_id").notNull().references(() => obiective.id, { onDelete: "cascade" }),
    tip: text("tip").notNull().default("legat"), // sprijina | depinde_de | legat
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("obiective_legaturi_unic").on(t.obiectivId, t.legatDeId)],
).enableRLS();

export const rezultateCheie = pgTable(
  "rezultate_cheie",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    obiectivId: uuid("obiectiv_id").notNull().references(() => obiective.id, { onDelete: "cascade" }),
    titlu: text("titlu").notNull(),
    descriere: text("descriere"),
    metoda: text("metoda").notNull().default("crescator"), // crescator | descrescator | interval | binar
    tipTinta: text("tip_tinta").notNull().default("cumulativ"), // cumulativ | periodic
    unitate: text("unitate"),
    nivelInitial: numeric("nivel_initial", { mode: "number" }),
    tinta: numeric("tinta", { mode: "number" }),
    tintaMax: numeric("tinta_max", { mode: "number" }),
    valoareCurenta: numeric("valoare_curenta", { mode: "number" }), // null = fără date (nu zero)
    pondere: integer("pondere").notNull().default(1),
    sursa: text("sursa").notNull().default("manual"), // manual | kpi | crm
    kpiDefinitieId: uuid("kpi_definitie_id").references(() => kpiDefinitii.id, { onDelete: "set null" }),
    kpiAngajatId: uuid("kpi_angajat_id").references(() => angajati.id, { onDelete: "set null" }),
    sursaConfig: jsonb("sursa_config").$type<Record<string, unknown>>(),
    frecventaActualizare: text("frecventa_actualizare").notNull().default("saptamanal"),
    ultimaActualizare: timestamp("ultima_actualizare", { withTimezone: true }),
    incredere: text("incredere"), // mare | medie | scazuta
    termen: date("termen"),
    responsabilId: uuid("responsabil_id").references(() => angajati.id, { onDelete: "set null" }),
    formula: text("formula"),
    reguli: text("reguli"),
    atribuire: text("atribuire"),
    status: text("status").notNull().default("activ"), // activ | anulat
    ordine: integer("ordine").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("rezultate_cheie_obiectiv_idx").on(t.obiectivId, t.ordine), index("rezultate_cheie_org_idx").on(t.orgId)],
).enableRLS();

export const rezultateActualizari = pgTable(
  "rezultate_actualizari",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    rezultatId: uuid("rezultat_id").notNull().references(() => rezultateCheie.id, { onDelete: "cascade" }),
    tip: text("tip").notNull().default("valoare"), // valoare | tinta | responsabil | incredere | nota
    valoare: numeric("valoare", { mode: "number" }),
    valoareAnterioara: numeric("valoare_anterioara", { mode: "number" }),
    tinta: numeric("tinta", { mode: "number" }),
    comentariu: text("comentariu"),
    dovadaUrl: text("dovada_url"),
    incredere: text("incredere"),
    detalii: jsonb("detalii").$type<Record<string, unknown>>(),
    autorUserId: uuid("autor_user_id").references(() => appUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("rezultate_actualizari_rezultat_idx").on(t.rezultatId, t.createdAt.desc())],
).enableRLS();

export const activitati = pgTable(
  "activitati",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    titlu: text("titlu").notNull(),
    descriere: text("descriere"),
    responsabilId: uuid("responsabil_id").references(() => angajati.id, { onDelete: "set null" }),
    obiectivId: uuid("obiectiv_id").references(() => obiective.id, { onDelete: "set null" }),
    rezultatId: uuid("rezultat_id").references(() => rezultateCheie.id, { onDelete: "set null" }),
    prioritate: text("prioritate").notNull().default("medie"), // critica | mare | medie | scazuta
    termen: date("termen"),
    efortOre: numeric("efort_ore", { precision: 5, scale: 1, mode: "number" }),
    status: text("status").notNull().default("de_facut"), // de_facut | in_lucru | in_asteptare | blocat | finalizat | anulat
    aprobareNecesara: boolean("aprobare_necesara").notNull().default(false),
    aprobataDe: uuid("aprobata_de").references(() => appUsers.id),
    aprobataLa: timestamp("aprobata_la", { withTimezone: true }),
    rezultatAsteptat: text("rezultat_asteptat"),
    criteriuFinalizare: text("criteriu_finalizare"),
    dependeDe: uuid("depinde_de"),
    recurenta: text("recurenta").notNull().default("nu"), // nu | saptamanal | lunar
    sursa: text("sursa").notNull().default("manual"), // manual | automatizare
    cheieAutomatizare: text("cheie_automatizare"),
    finalizatLa: timestamp("finalizat_la", { withTimezone: true }),
    creatDe: uuid("creat_de").references(() => appUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("activitati_org_termen_idx").on(t.orgId, t.termen),
    index("activitati_responsabil_idx").on(t.orgId, t.responsabilId, t.status),
    uniqueIndex("activitati_automatizare_idx").on(t.orgId, t.cheieAutomatizare).where(sql`${t.cheieAutomatizare} is not null`),
  ],
).enableRLS();

export const blocaje = pgTable(
  "blocaje",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    activitateId: uuid("activitate_id").references(() => activitati.id, { onDelete: "cascade" }),
    obiectivId: uuid("obiectiv_id").references(() => obiective.id, { onDelete: "cascade" }),
    motiv: text("motiv").notNull(),
    responsabilRezolvareId: uuid("responsabil_rezolvare_id").references(() => angajati.id, { onDelete: "set null" }),
    raportatDeId: uuid("raportat_de_id").references(() => angajati.id, { onDelete: "set null" }),
    termenRevenire: date("termen_revenire").notNull(),
    necesitaDecizie: boolean("necesita_decizie").notNull().default(false),
    status: text("status").notNull().default("deschis"), // deschis | rezolvat | anulat
    rezolvare: text("rezolvare"),
    deschisLa: timestamp("deschis_la", { withTimezone: true }).defaultNow().notNull(),
    rezolvatLa: timestamp("rezolvat_la", { withTimezone: true }),
  },
  (t) => [index("blocaje_org_status_idx").on(t.orgId, t.status)],
).enableRLS();

export const angajatiAbsente = pgTable(
  "angajati_absente",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    angajatId: uuid("angajat_id").notNull().references(() => angajati.id, { onDelete: "cascade" }),
    tip: text("tip").notNull().default("concediu"), // concediu | medical | altele
    dataStart: date("data_start").notNull(),
    dataSfarsit: date("data_sfarsit").notNull(),
    nota: text("nota"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("angajati_absente_idx").on(t.orgId, t.angajatId, t.dataStart)],
).enableRLS();

export const performantaNotificari = pgTable(
  "performanta_notificari",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    appUserId: uuid("app_user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
    tip: text("tip").notNull(),
    titlu: text("titlu").notNull(),
    continut: text("continut"),
    link: text("link"),
    cheieDedup: text("cheie_dedup"),
    citit: boolean("citit").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("performanta_notificari_user_idx").on(t.orgId, t.appUserId, t.citit, t.createdAt.desc()),
    uniqueIndex("performanta_notificari_dedup_idx").on(t.orgId, t.appUserId, t.cheieDedup).where(sql`${t.cheieDedup} is not null`),
  ],
).enableRLS();
