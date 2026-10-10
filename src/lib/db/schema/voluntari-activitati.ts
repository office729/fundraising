import { boolean, date, index, integer, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { appUsers } from "./app-users";
import { fundraisingPages } from "./fundraising-pages";
import { organizations } from "./organizations";
import { volunteerVisitors } from "./voluntari-panou";

// Voluntari: sarcini online, activități pe teren, înscrieri, ore și raportări. Toate au org_id + RLS de izolare pe organizație
// (vezi scripts/restore-rls.mjs); accesul public al voluntarilor trece prin același cod de link ca panoul (voluntari-panou-server).
// SQL-ul e în documentation/voluntari-activitati.sql.

export const volunteerTasks = pgTable(
  "volunteer_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    titlu: text("titlu").notNull(),
    descriere: text("descriere").notNull(), // „ce trebuie făcut”
    tip: text("tip").notNull().default("distribuie"), // distribuie | text | grafica | altceva
    campaignPageId: uuid("campaign_page_id").references(() => fundraisingPages.id, { onDelete: "set null" }),
    textRecomandat: text("text_recomandat"),
    linkBaza: text("link_baza"),
    imagineUrl: text("imagine_url"),
    canale: text("canale").notNull().default(""), // id-uri separate prin virgulă (vezi CANALE_VOLUNTAR)
    inceputLa: date("incepe_la"),
    termen: date("termen"),
    nrVoluntari: integer("nr_voluntari"),
    minuteEstimate: integer("minute_estimate"),
    instructiuni: text("instructiuni"),
    stare: text("stare").notNull().default("publicata"), // ciorna | publicata | inchisa
    createdBy: uuid("created_by").references(() => appUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("volunteer_tasks_org_idx").on(t.orgId, t.createdAt.desc())],
).enableRLS();

export const volunteerTaskEngagements = pgTable(
  "volunteer_task_engagements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    taskId: uuid("task_id").notNull().references(() => volunteerTasks.id, { onDelete: "cascade" }),
    visitorId: uuid("visitor_id").notNull().references(() => volunteerVisitors.id, { onDelete: "cascade" }),
    stare: text("stare").notNull().default("angajat"), // angajat | finalizat | renuntat
    linkPostare: text("link_postare"),
    confirmat: boolean("confirmat").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    finalizatLa: timestamp("finalizat_la", { withTimezone: true }),
  },
  (t) => [unique("volunteer_task_engagements_task_id_visitor_id_key").on(t.taskId, t.visitorId), index("volunteer_task_engagements_org_idx").on(t.orgId, t.createdAt.desc())],
).enableRLS();

export const volunteerActivities = pgTable(
  "volunteer_activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    titlu: text("titlu").notNull(),
    descriere: text("descriere"),
    locatie: text("locatie").notNull(),
    localitate: text("localitate"),
    inceputLa: timestamp("incepe_la", { withTimezone: true }).notNull(),
    seTerminaLa: timestamp("se_termina_la", { withTimezone: true }).notNull(),
    coordonatorNume: text("coordonator_nume"),
    coordonatorTelefon: text("coordonator_telefon"),
    aprobare: text("aprobare").notNull().default("automata"), // automata | manuala
    cerinte: text("cerinte"),
    instructiuni: text("instructiuni"),
    contactZi: text("contact_zi"),
    cuMinori: boolean("cu_minori").notNull().default(false),
    rezultatEticheta: text("rezultat_eticheta"),
    rezultatValoare: numeric("rezultat_valoare", { precision: 12, scale: 2 }),
    campaignPageId: uuid("campaign_page_id").references(() => fundraisingPages.id, { onDelete: "set null" }),
    coordinatorToken: text("coordinator_token"), // codul secret al linkului de coordonator (unic, parțial în SQL)
    stare: text("stare").notNull().default("publicata"), // ciorna | publicata | incheiata | anulata
    createdBy: uuid("created_by").references(() => appUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("volunteer_activities_org_idx").on(t.orgId, t.inceputLa.desc())],
).enableRLS();

// Tură + rol într-un singur rând (ex. „Primire, 09–12, 6 locuri”); implicit o linie „Voluntar” pe toată activitatea.
export const volunteerShifts = pgTable(
  "volunteer_shifts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    activityId: uuid("activity_id").notNull().references(() => volunteerActivities.id, { onDelete: "cascade" }),
    nume: text("nume").notNull().default("Voluntar"),
    inceputLa: timestamp("incepe_la", { withTimezone: true }).notNull(),
    seTerminaLa: timestamp("se_termina_la", { withTimezone: true }).notNull(),
    locuri: integer("locuri").notNull().default(10),
  },
  (t) => [index("volunteer_shifts_activity_idx").on(t.activityId)],
).enableRLS();

export const volunteerSignups = pgTable(
  "volunteer_signups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    activityId: uuid("activity_id").notNull().references(() => volunteerActivities.id, { onDelete: "cascade" }),
    shiftId: uuid("shift_id").notNull().references(() => volunteerShifts.id, { onDelete: "cascade" }),
    visitorId: uuid("visitor_id").notNull().references(() => volunteerVisitors.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("confirmata"), // in_asteptare | confirmata | rezerva | prezent | absent | anulata
    oreCalculate: numeric("ore_calculate", { precision: 5, scale: 2 }),
    oreValidate: numeric("ore_validate", { precision: 5, scale: 2 }),
    validatLa: timestamp("validat_la", { withTimezone: true }),
    validatDe: uuid("validat_de").references(() => appUsers.id, { onDelete: "set null" }),
    observatii: text("observatii"),
    reminderTrimisLa: timestamp("reminder_trimis_la", { withTimezone: true }),
    multumireTrimisaLa: timestamp("multumire_trimisa_la", { withTimezone: true }),
    checkinLa: timestamp("checkin_la", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique("volunteer_signups_shift_id_visitor_id_key").on(t.shiftId, t.visitorId),
    index("volunteer_signups_org_idx").on(t.orgId, t.createdAt.desc()),
    index("volunteer_signups_activity_idx").on(t.activityId),
    index("volunteer_signups_visitor_idx").on(t.visitorId),
  ],
).enableRLS();

export const volunteerReports = pgTable(
  "volunteer_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    visitorId: uuid("visitor_id").references(() => volunteerVisitors.id, { onDelete: "set null" }),
    activityId: uuid("activity_id").references(() => volunteerActivities.id, { onDelete: "set null" }),
    taskId: uuid("task_id").references(() => volunteerTasks.id, { onDelete: "set null" }),
    descriere: text("descriere").notNull(),
    stare: text("stare").notNull().default("noua"), // noua | rezolvata
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("volunteer_reports_org_idx").on(t.orgId, t.createdAt.desc())],
).enableRLS();
