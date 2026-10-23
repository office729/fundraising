import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { appUsers } from "./app-users";
import { companies } from "./companies";
import { contacts } from "./contacts";
import { organizations } from "./organizations";

// Prospectare de decidenți (documentation/prospectare.sql): chei proprii ale organizației, candidați de aprobat, jurnal de apeluri, suprimări.
export const prospectareChei = pgTable(
  "prospectare_chei",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    cheieEnc: text("cheie_enc").notNull(),
    amprenta: text("amprenta").notNull().default(""),
    // Alegeri ale organizației pentru conector (Waalaxy: lista și campania în care se trimit persoanele aprobate).
    setari: jsonb("setari").$type<Record<string, string>>().notNull().default({}),
    adaugatDe: uuid("adaugat_de").references(() => appUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("prospectare_chei_org_provider").on(t.orgId, t.provider)],
).enableRLS();

export const prospectareCandidati = pgTable(
  "prospectare_candidati",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    nume: text("nume").notNull(),
    numeNorm: text("nume_norm").notNull(),
    rol: text("rol"),
    dept: text("dept"),
    linkedin: text("linkedin"),
    email: text("email"),
    emailStatus: text("email_status"),
    sursa: text("sursa").notNull(),
    scor: integer("scor").notNull().default(0),
    stare: text("stare").notNull().default("nou"), // nou | aprobat | respins
    gasitDe: uuid("gasit_de").references(() => appUsers.id, { onDelete: "set null" }),
    gasitLa: timestamp("gasit_la", { withTimezone: true }).defaultNow().notNull(),
    hotaratDe: uuid("hotarat_de").references(() => appUsers.id, { onDelete: "set null" }),
    hotaratLa: timestamp("hotarat_la", { withTimezone: true }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  },
  (t) => [uniqueIndex("prospectare_candidati_unic").on(t.companyId, t.numeNorm), index("prospectare_candidati_org_idx").on(t.orgId, t.companyId, t.stare)],
).enableRLS();

export const prospectareJurnal = pgTable(
  "prospectare_jurnal",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    operatie: text("operatie").notNull(),
    ok: boolean("ok").notNull().default(true),
    unitati: integer("unitati").notNull().default(1),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => appUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("prospectare_jurnal_org_idx").on(t.orgId, t.createdAt)],
).enableRLS();

export const prospectareSuprimati = pgTable(
  "prospectare_suprimati",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    tip: text("tip").notNull(), // email | linkedin | nume
    valoare: text("valoare").notNull(),
    motiv: text("motiv"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("prospectare_suprimati_unic").on(t.orgId, t.tip, t.valoare)],
).enableRLS();
