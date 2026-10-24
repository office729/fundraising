import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Lead-uri de pe site-ul public (documentation/interese-ong.sql): ONG-urile care au completat formularul „Descoperă Alexandrit”. Tabel al platformei, fără org_id:
// îl scrie formularul public (app.interes_site) și îl citește doar echipa platformei (app.platform_admin).
export const intereseOng = pgTable(
  "interese_ong",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nume: text("nume").notNull(),
    organizatie: text("organizatie").notNull(),
    email: text("email").notNull(),
    telefon: text("telefon"),
    cale: text("cale"),
    campanie: text("campanie"),
    stare: text("stare").notNull().default("nou"), // nou | contactat | in_discutie | inscris | pierdut
    notita: text("notita"),
    nrTrimiteri: integer("nr_trimiteri").notNull().default(1),
    creatLa: timestamp("creat_la", { withTimezone: true }).notNull().defaultNow(),
    ultimaTrimitereLa: timestamp("ultima_trimitere_la", { withTimezone: true }).notNull().defaultNow(),
    actualizatLa: timestamp("actualizat_la", { withTimezone: true }),
    actualizatDe: text("actualizat_de"),
  },
  (t) => [uniqueIndex("interese_ong_email_unic").on(sql`lower(${t.email})`), index("interese_ong_stare_idx").on(t.stare, t.creatLa)],
).enableRLS();
