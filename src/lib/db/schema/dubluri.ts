import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { appUsers } from "./app-users";
import { organizations } from "./organizations";

// Grupuri de donatori marcate „Nu sunt aceeași persoană” (documentation/donatori-igiena.sql): nu se mai propun la îmbinare, decât dacă în grup apare un donator nou.
export const dubluriRespinse = pgTable(
  "dubluri_respinse",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    semnatura: text("semnatura").notNull(),
    respinsLa: timestamp("respins_la", { withTimezone: true }).notNull().defaultNow(),
    respinsDe: uuid("respins_de").references(() => appUsers.id, { onDelete: "set null" }),
  },
  (t) => [uniqueIndex("dubluri_respinse_org_semnatura").on(t.orgId, t.semnatura)],
).enableRLS();
