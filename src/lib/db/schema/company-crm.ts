import { date, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { appUsers } from "./app-users";
import { companies } from "./companies";
import { apelStatus } from "./enums";
import { organizations } from "./organizations";

// Sponsorizări REALE, cu dată — sursa de adevăr pentru statisticile filtrate
// pe perioadă din modulul CRM Companii (companies.sumaSponsorizata rămâne un
// cache agregat, actualizat la fiecare inserare/ștergere de-aici, dar
// filtrarea pe Q1-Q4/an/lună/interval se face DOAR pe acest tabel, nu pe
// cache). orgId denormalizat intenționat — RLS simplu, fără JOIN pe companies.
export const companySponsorizari = pgTable(
  "company_sponsorizari",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    suma: integer("suma").notNull(), // lei
    data: date("data").notNull(),
    proiect: text("proiect"),
    nota: text("nota"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => appUsers.id),
  },
  (t) => [
    index("company_sponsorizari_org_idx").on(t.orgId),
    index("company_sponsorizari_company_idx").on(t.companyId),
    index("company_sponsorizari_data_idx").on(t.data),
  ],
).enableRLS();

// Notițe reale (înlocuiesc notele locale din localStorage ale prototipului
// vechi) — text simplu, cronologic, editabil/ștergabil de oricine din org.
export const companyNotite = pgTable(
  "company_notite",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => appUsers.id),
    editatLa: timestamp("editat_la", { withTimezone: true }),
  },
  (t) => [index("company_notite_org_idx").on(t.orgId), index("company_notite_company_idx").on(t.companyId)],
).enableRLS();

// Jurnal REAL de apeluri, prin Twilio Voice (vezi src/lib/twilio.ts +
// src/app/api/twilio/**) — sursa reală pentru "Apeluri" din dashboard
// (Activitatea echipei), în loc de valoarea demonstrativă fixă de dinainte.
// companyId nullable — un apel poate fi către o persoană fizică (fără firmă).
export const apeluri = pgTable(
  "apeluri",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    catreNume: text("catre_nume"), // snapshot — rămâne lizibil chiar dacă firma/contactul se șterge ulterior
    catreTelefon: text("catre_telefon").notNull(), // E.164
    initiatorId: uuid("initiator_id").references(() => appUsers.id),
    twilioCallSid: text("twilio_call_sid"),
    status: apelStatus("status").notNull().default("initiat"),
    durataSecunde: integer("durata_secunde"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("apeluri_org_idx").on(t.orgId),
    index("apeluri_company_idx").on(t.companyId),
    index("apeluri_created_at_idx").on(t.createdAt),
  ],
).enableRLS();
