import { boolean, index, jsonb, pgTable, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { appUsers } from "./app-users";
import { organizations } from "./organizations";

// Feedback de la utilizatorii platformei: chestionarul de satisfacție (tip „chestionar”) și sugestiile (tip „sugestie”).
// RLS: membrii organizației citesc și adaugă; echipa platformei citește și răspunde peste toate (vezi documentation/feedback.sql).
export const feedbackPlatforma = pgTable(
  "feedback_platforma",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => appUsers.id, { onDelete: "set null" }),
    tip: text("tip").notNull(), // chestionar | sugestie
    nps: smallint("nps"), // 0–10
    satisfactie: smallint("satisfactie"), // 1–5
    note: jsonb("note").$type<Record<string, number>>().notNull().default({}),
    module: jsonb("module").$type<string[]>().notNull().default([]),
    cePlace: text("ce_place"),
    ceLipseste: text("ce_lipseste"),
    categorie: text("categorie"),
    titlu: text("titlu"),
    mesaj: text("mesaj"),
    poateContacta: boolean("poate_contacta").notNull().default(false),
    stare: text("stare").notNull().default("nou"), // nou | in-analiza | planificat | livrat | nu-acum
    raspuns: text("raspuns"),
    raspunsLa: timestamp("raspuns_la", { withTimezone: true }),
    raspunsDe: text("raspuns_de"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("feedback_platforma_org_idx").on(t.orgId, t.tip, t.createdAt), index("feedback_platforma_tip_idx").on(t.tip, t.createdAt)],
).enableRLS();
