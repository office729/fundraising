import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { companies } from "./companies";
import { contacts } from "./contacts";
import { organizations } from "./organizations";

// Jurnalul evenimentelor Waalaxy (documentation/waalaxy-outreach.sql), doar pentru persoane potrivite cu o firmă din CRM; fără textul mesajelor. RLS forțat pe organizație.
export const outreachEvenimente = pgTable(
  "outreach_evenimente",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
    tip: text("tip").notNull(), // invitat | conectat | raspuns
    refuz: boolean("refuz").notNull().default(false),
    campanie: text("campanie"),
    externId: text("extern_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("outreach_evenimente_unic").on(t.orgId, t.externId), index("outreach_evenimente_org_idx").on(t.orgId, t.tip, t.createdAt), index("outreach_evenimente_contact_idx").on(t.contactId)],
).enableRLS();
