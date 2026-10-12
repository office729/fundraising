import { date, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { fundraisingPages } from "./fundraising-pages";
import { organizations } from "./organizations";

// Trafic măsurat de Alexandrit pe paginile publice de campanie (fără cookie-uri, fără IP stocat, fără scripturi terțe):
// vizualizări și deschiderea formularului de donație. Organizația își vede doar propriile rânduri (RLS pe org_id).
// `vizitator` e o amprentă care se schimbă zilnic (HMAC din IP + browser + ziua), deci permite numărarea vizitatorilor unici
// într-o zi, dar nu și urmărirea cuiva de la o zi la alta.
export const campaignPageEvents = pgTable(
  "campaign_page_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    pageId: uuid("page_id")
      .notNull()
      .references(() => fundraisingPages.id, { onDelete: "cascade" }),
    tip: text("tip").notNull(), // "vizita" | "deschide_donatia"
    ziua: date("ziua", { mode: "string" }).notNull(), // ziua în ora României
    vizitator: text("vizitator").notNull(),
    sursa: text("sursa").notNull().default("direct"), // direct | social | cautare | email | site | trimitere
    sursaDetaliu: text("sursa_detaliu"), // gazda de proveniență sau utm_source, curățate
    utmCampanie: text("utm_campanie"),
    dispozitiv: text("dispozitiv").notNull().default("desktop"), // mobil | tableta | desktop
    tara: text("tara"), // cod de țară din antetul platformei de găzduire (2 litere), dacă există
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("campaign_page_events_page_ziua_idx").on(t.pageId, t.ziua), index("campaign_page_events_org_ziua_idx").on(t.orgId, t.ziua)],
).enableRLS();
