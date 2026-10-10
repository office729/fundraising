import { boolean, date, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { appUsers } from "./app-users";
import { organizations } from "./organizations";

// Certificate emise cu un cod public de verificare (pagina /v/<cod>). Pagina publică citește doar prin politica `app.public_lookup`,
// cu `where cod = …`; conținutul e exact cel de pe certificat. Vezi documentation/verificari-surse.sql.
export const certificateVerificari = pgTable(
  "certificate_verificari",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    cod: text("cod").notNull().unique(),
    destinatar: text("destinatar").notNull(),
    titlu: text("titlu").notNull(),
    dataEmitere: date("data_emitere").notNull(),
    numar: text("numar"),
    orgNume: text("org_nume").notNull(),
    orgSlug: text("org_slug").notNull(),
    revocat: boolean("revocat").notNull().default(false),
    creatDe: uuid("creat_de").references(() => appUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("certificate_verificari_org_idx").on(t.orgId, t.createdAt)],
).enableRLS();
