import { boolean, date, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { appUsers } from "./app-users";
import {
  angajatNivelAcces,
  angajatProgramLucru,
  angajatStatus,
  kpiAtribuireStatus,
  kpiDirectie,
  kpiFrecventa,
  kpiPerioadaTip,
  kpiTip,
  kpiValoareSursa,
} from "./enums";
import { organizations } from "./organizations";

// Modulul KPI generic — fiecare ONG își definește propria structură
// (departamente/roluri/angajați) și propriile KPI (nimic hardcodat în motor,
// vezi plan). Toate tabelele: org_id + RLS, pattern identic cu restul
// schemei (crm_kv, company_sponsorizari etc.).

// --- Organizație & Echipă (Faza A) -----------------------------------------

export const departments = pgTable(
  "departments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    nume: text("nume").notNull(),
    descriere: text("descriere"),
    // Sub-departamente opționale — majoritatea ONG-urilor nu au nevoie de asta,
    // dar structura o permite fără migrare ulterioară.
    parentId: uuid("parent_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
).enableRLS();

export const roluri = pgTable(
  "roluri",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    nume: text("nume").notNull(),
    descriere: text("descriere"),
    responsabilitati: text("responsabilitati"),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
).enableRLS();

// Profil de angajat — DISTINCT de app_users/memberships. Poate exista fără
// cont de login propriu (ex. un voluntar urmărit administrativ, netrecut
// încă în platformă) — appUserId e nullable tocmai pentru asta.
export const angajati = pgTable(
  "angajati",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    appUserId: uuid("app_user_id").references(() => appUsers.id, { onDelete: "set null" }),
    nume: text("nume").notNull(),
    prenume: text("prenume"),
    email: text("email"),
    telefon: text("telefon"),
    roleId: uuid("role_id").references(() => roluri.id, { onDelete: "set null" }),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    // Auto-referință — „cui raportează" acest angajat. Stă la baza scopării
    // Manager (vede propriile rapoarte directe+indirecte), calculată în
    // server actions, nu prin RLS (colegi din același org, deja de încredere).
    managerId: uuid("manager_id"),
    dataInceperii: date("data_inceperii"),
    status: angajatStatus("status").notNull().default("activ"),
    programLucru: angajatProgramLucru("program_lucru"),
    // Procent normă — bază pentru recalcularea pro-rata a targeturilor
    // (Faza C). 100 = normă întreagă.
    normaProcent: integer("norma_procent").notNull().default(100),
    locatie: text("locatie"),
    responsabilitati: text("responsabilitati"),
    // Organization Admin vine din membershipRole (owner/admin), NU de aici —
    // acestea sunt doar nivelurile de sub-scopare KPI.
    nivelAcces: angajatNivelAcces("nivel_acces").notNull().default("membru"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    // Cel mult UN profil de angajat per cont de login, per organizație —
    // fără asta, dashboard-ul personal (care face .limit(1) fără ORDER BY)
    // ar alege nedeterminist între două profiluri dacă un admin leagă din
    // greșeală același cont de doi angajați.
    uniqueIndex("angajati_org_app_user_idx").on(t.orgId, t.appUserId).where(sql`${t.appUserId} is not null`),
  ],
).enableRLS();

// --- KPI Library (Faza B) ---------------------------------------------------

export const kpiCategorii = pgTable(
  "kpi_categorii",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    nume: text("nume").notNull(),
    culoare: text("culoare"),
    ordine: integer("ordine").notNull().default(0),
    // Seed la prima activare a modulului (14 categorii sugerate) — NU
    // hardcodate în motor, doar date inserate o dată, editabile liber după.
    esteDefault: boolean("este_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
).enableRLS();

export const kpiDefinitii = pgTable(
  "kpi_definitii",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    categorieId: uuid("categorie_id").references(() => kpiCategorii.id, { onDelete: "set null" }),
    nume: text("nume").notNull(),
    descriere: text("descriere"),
    tip: kpiTip("tip").notNull(),
    unitate: text("unitate"),
    directie: kpiDirectie("directie").notNull().default("mai_mare_mai_bine"),
    frecventa: kpiFrecventa("frecventa").notNull().default("lunar"),
    // { tip: 'crm'|'task'|'proiect'|'donatori'|'companii'|'voluntari'|
    //   'beneficiari'|'formular'|'financiar'|'eveniment'|'manual'|'api_extern',
    //   metric, filtru, agregare } — categorii GENERICE de sursă, nu nume de
    //   tabele; maparea pe tabelele reale ale fiecărui modul CRM e un adaptor
    //   construit în Faza C, nu hardcodat aici.
    sursaDate: jsonb("sursa_date"),
    esteManual: boolean("este_manual").notNull().default(false),
    esteActiv: boolean("este_activ").notNull().default(true),
    createdBy: uuid("created_by").references(() => appUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
  },
).enableRLS();

export const kpiSabloane = pgTable(
  "kpi_sabloane",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    nume: text("nume").notNull(),
    descriere: text("descriere"),
    roleId: uuid("role_id").references(() => roluri.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
).enableRLS();

export const kpiSabloaneItemi = pgTable(
  "kpi_sabloane_itemi",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sablonId: uuid("sablon_id").notNull().references(() => kpiSabloane.id, { onDelete: "cascade" }),
    kpiDefinitieId: uuid("kpi_definitie_id").notNull().references(() => kpiDefinitii.id, { onDelete: "cascade" }),
    pondere: integer("pondere"),
    targetDefault: jsonb("target_default"),
  },
).enableRLS();

// --- Atribuiri, targeturi, valori (Faza C) ---------------------------------

export const kpiProfiluriSezoniere = pgTable(
  "kpi_profiluri_sezoniere",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    nume: text("nume").notNull(),
    dataStart: date("data_start").notNull(),
    dataSfarsit: date("data_sfarsit").notNull(),
    recurent: boolean("recurent").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
).enableRLS();

export const kpiProfiluriSezoniereItemi = pgTable(
  "kpi_profiluri_sezoniere_itemi",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profilId: uuid("profil_id").notNull().references(() => kpiProfiluriSezoniere.id, { onDelete: "cascade" }),
    kpiDefinitieId: uuid("kpi_definitie_id").notNull().references(() => kpiDefinitii.id, { onDelete: "cascade" }),
    targetOverride: jsonb("target_override"),
    pondereOverride: integer("pondere_override"),
  },
).enableRLS();

export const kpiAtribuiri = pgTable(
  "kpi_atribuiri",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    angajatId: uuid("angajat_id").notNull().references(() => angajati.id, { onDelete: "cascade" }),
    kpiDefinitieId: uuid("kpi_definitie_id").notNull().references(() => kpiDefinitii.id, { onDelete: "cascade" }),
    pondere: integer("pondere"),
    targetMinim: numeric("target_minim", { mode: "number" }),
    targetNormal: numeric("target_normal", { mode: "number" }),
    targetStretch: numeric("target_stretch", { mode: "number" }),
    // Dacă targetul se recalculează proporțional cu norma/zilele lucrate
    // (vezi angajati.normaProcent) sau rămâne fix indiferent de program.
    proRata: boolean("pro_rata").notNull().default(true),
    profilSezonierId: uuid("profil_sezonier_id").references(() => kpiProfiluriSezoniere.id, { onDelete: "set null" }),
    dataStart: date("data_start"),
    dataSfarsit: date("data_sfarsit"),
    status: kpiAtribuireStatus("status").notNull().default("activ"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("kpi_atribuiri_angajat_kpi_idx").on(t.angajatId, t.kpiDefinitieId)],
).enableRLS();

// Fapt persistat — AICI scriu atât automatizările (Faza C) cât și intrările
// manuale; istoricul modificărilor manuale merge în kpi_audit_log, nu
// printr-un rând duplicat aici.
export const kpiValori = pgTable(
  "kpi_valori",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    angajatId: uuid("angajat_id").notNull().references(() => angajati.id, { onDelete: "cascade" }),
    kpiDefinitieId: uuid("kpi_definitie_id").notNull().references(() => kpiDefinitii.id, { onDelete: "cascade" }),
    perioadaStart: date("perioada_start").notNull(),
    perioadaTip: kpiPerioadaTip("perioada_tip").notNull(),
    valoare: numeric("valoare", { mode: "number" }).notNull(),
    sursa: kpiValoareSursa("sursa").notNull().default("manual"),
    comentariu: text("comentariu"),
    dovadaUrl: text("dovada_url"),
    inregistratDe: uuid("inregistrat_de").references(() => appUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("kpi_valori_unic_idx").on(t.angajatId, t.kpiDefinitieId, t.perioadaStart, t.perioadaTip),
  ],
).enableRLS();

// --- Funnel Builder (Faza F) — schemă simplă acum, UI de reordonare mai târziu

export const kpiFunnels = pgTable(
  "kpi_funnels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    nume: text("nume").notNull(),
    aplicaPe: text("aplica_pe"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
).enableRLS();

export const kpiFunnelEtape = pgTable(
  "kpi_funnel_etape",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    funnelId: uuid("funnel_id").notNull().references(() => kpiFunnels.id, { onDelete: "cascade" }),
    nume: text("nume").notNull(),
    ordine: integer("ordine").notNull().default(0),
    culoare: text("culoare"),
  },
).enableRLS();

// --- Audit (transversal, din Faza A) ---------------------------------------

export const kpiAuditLog = pgTable(
  "kpi_audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => appUsers.id),
    actiune: text("actiune").notNull(),
    entitate: text("entitate").notNull(),
    entitateId: uuid("entitate_id"),
    detalii: jsonb("detalii"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
).enableRLS();

// --- Check-in săptămânal și 1:1 (Faza G) -----------------------------------
// Un singur tabel pentru ambele: `tip` = "checkin" (scris de angajat despre sine) | "1la1" (notițele manager-ului după o
// discuție, vizibile și angajatului — transparență, nu supraveghere). `continut` ține câmpurile fiecărui tip.
export const kpiInteractiuni = pgTable(
  "kpi_interactiuni",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    angajatId: uuid("angajat_id").notNull().references(() => angajati.id, { onDelete: "cascade" }),
    autorUserId: uuid("autor_user_id").references(() => appUsers.id),
    tip: text("tip").notNull(),
    data: date("data").notNull(),
    continut: jsonb("continut").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("kpi_interactiuni_angajat_idx").on(t.orgId, t.angajatId, t.tip, t.data.desc())],
).enableRLS();
