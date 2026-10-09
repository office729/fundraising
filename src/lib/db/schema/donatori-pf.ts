import { date, index, integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { appUsers } from "./app-users";
import { fundraisingPages } from "./fundraising-pages";
import { organizations } from "./organizations";

// CRM Persoane fizice: importuri de donații (fișiere CSV/XLSX). Fiecare import e o „sursă” (nume + interval de date), reversibilă:
// ștergerea ei scoate toate donațiile importate (cascadă) și donatorii creați doar de ea.
export const donatoriImporturi = pgTable(
  "donatori_importuri",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    nume: text("nume").notNull(),
    de: date("de"),
    pana: date("pana"),
    nrRanduri: integer("nr_randuri").notNull().default(0),
    nrImportate: integer("nr_importate").notNull().default(0),
    nrDuplicate: integer("nr_duplicate").notNull().default(0),
    nrDonatoriNoi: integer("nr_donatori_noi").notNull().default(0),
    createdBy: uuid("created_by").references(() => appUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("donatori_importuri_org_idx").on(t.orgId, t.createdAt.desc())],
).enableRLS();

// O donație venită dintr-un import. `proiect` e numele din fișier; `proiectPageId` se completează când numele se potrivește cu o
// campanie a platformei. Donațiile online și cele înregistrate manual rămân în fundraising_donations; analizele le unesc pe toate.
export const donatiiImportate = pgTable(
  "donatii_importate",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    importId: uuid("import_id")
      .notNull()
      .references(() => donatoriImporturi.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    nume: text("nume"),
    suma: integer("suma").notNull(), // lei
    moneda: text("moneda").notNull().default("RON"),
    sumaOriginala: numeric("suma_originala", { precision: 14, scale: 2 }),
    data: timestamp("data", { withTimezone: true }).notNull(),
    proiect: text("proiect"),
    proiectPageId: uuid("proiect_page_id").references(() => fundraisingPages.id, { onDelete: "set null" }),
    procesator: text("procesator"),
    idExtern: text("id_extern"),
    status: text("status").notNull().default("reusita"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("donatii_importate_org_email_idx").on(t.orgId, t.email),
    index("donatii_importate_import_idx").on(t.importId),
    uniqueIndex("donatii_importate_extern_idx").on(t.orgId, t.idExtern).where(sql`${t.idExtern} is not null`),
  ],
).enableRLS();
