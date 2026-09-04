import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { appUsers } from "./app-users";
import { companies } from "./companies";
import { consentStatus } from "./enums";
import { organizations } from "./organizations";

// Persoane de contact dintr-o firmă (CRM PJ), cu consimțământ GDPR trasabil.
export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    nume: text("nume").notNull(),
    rol: text("rol"),
    dept: text("dept"),
    loc: text("loc"),
    email: text("email"),
    telefon: text("telefon"),
    linkedin: text("linkedin"),
    detalii: text("detalii"),
    cheie: boolean("cheie").notNull().default(false),
    // GDPR
    consentStatus: consentStatus("consent_status").notNull().default("necunoscut"),
    consentAt: timestamp("consent_at", { withTimezone: true }),
    consentSource: text("consent_source"),
    consentBy: uuid("consent_by").references(() => appUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => appUsers.id),
  },
  (t) => [index("contacts_org_idx").on(t.orgId), index("contacts_company_idx").on(t.companyId)],
).enableRLS();
