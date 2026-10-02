import { integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { appUsers } from "./app-users";
import { companies } from "./companies";
import { companyReportStatus, financialDocExtractieStatus, financialDocTip } from "./enums";
import { organizations } from "./organizations";

// Modulul „Raport de activitate companii" — vezi CLAUDE plan. ONG-ul încarcă
// Balanța/Bilanțul anual (org-wide, nu per companie), AI extrage cifrele
// (confirmate manual de admin înainte de folosire — vezi confirmatLa), apoi
// generează un raport personalizat per companie sponsor/an, trimis opțional
// ca design Canva (Autofill, vezi canva-connections mai jos).

// Un singur document per (organizație, an, tip) — un upload nou îl înlocuiește,
// nu acumulează versiuni. fisierPath e o cale de storage privată (bucket
// org-financial-docs), NU un URL public — se afișează prin createSignedUrl.
export const financialDocuments = pgTable(
  "financial_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    an: integer("an").notNull(),
    tip: financialDocTip("tip").notNull(),
    fisierPath: text("fisier_path").notNull(),
    fisierNume: text("fisier_nume").notNull(),
    mimeType: text("mime_type").notNull(),
    marimeBytes: integer("marime_bytes").notNull(),
    incarcatDe: uuid("incarcat_de").references(() => appUsers.id),
    incarcatLa: timestamp("incarcat_la", { withTimezone: true }).defaultNow().notNull(),
    // Cifrele găsite de AI (venituri, cheltuieli, activeTotale, datoriiTotale,
    // capitalPropriu, rezultatNet) — null pentru orice cifră negăsită clar în
    // document; AI-ul are interdicție explicită să estimeze (vezi ai.ts).
    dateExtrase: jsonb("date_extrase"),
    extractieStatus: financialDocExtractieStatus("extractie_status").notNull().default("in_asteptare"),
    extractieEroare: text("extractie_eroare"),
    // Un admin trebuie să confirme (sau corecteze) cifrele extrase înainte ca
    // ele să poată fi folosite într-un raport trimis unui sponsor — gardă
    // anti-halucinație, AI-ul nu scrie niciodată direct într-un document extern.
    confirmatDe: uuid("confirmat_de").references(() => appUsers.id),
    confirmatLa: timestamp("confirmat_la", { withTimezone: true }),
  },
  (t) => [uniqueIndex("financial_documents_org_an_tip_idx").on(t.orgId, t.an, t.tip)],
).enableRLS();

// Un raport per (companie, an) — conținutul e editabil în UI înainte de a fi
// trimis către Canva; sumaSponsorizata a companiei pentru anul respectiv se
// calculează live din company_sponsorizari, nu se duplică aici.
export const companyActivityReports = pgTable(
  "company_activity_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    an: integer("an").notNull(),
    sursaFinanciaraId: uuid("sursa_financiara_id").references(() => financialDocuments.id, { onDelete: "set null" }),
    // { titlu, introducere, rezumatFinanciar, folosireFonduri, impact, multumire }
    continut: jsonb("continut"),
    status: companyReportStatus("status").notNull().default("generat"),
    canvaDesignId: text("canva_design_id"),
    canvaEditUrl: text("canva_edit_url"),
    canvaViewUrl: text("canva_view_url"),
    canvaEroare: text("canva_eroare"),
    generatDe: uuid("generat_de").references(() => appUsers.id),
    generatLa: timestamp("generat_la", { withTimezone: true }).defaultNow().notNull(),
    trimisCanvaLa: timestamp("trimis_canva_la", { withTimezone: true }),
  },
  (t) => [uniqueIndex("company_activity_reports_company_an_idx").on(t.companyId, t.an)],
).enableRLS();

// O singură conexiune Canva per organizație — token-uri criptate (vezi
// secret-box.ts), refresh lazy înainte de orice apel (vezi lib/canva.ts).
export const canvaConnections = pgTable(
  "canva_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .unique()
      .references(() => organizations.id, { onDelete: "cascade" }),
    accessTokenEnc: text("access_token_enc").notNull(),
    refreshTokenEnc: text("refresh_token_enc").notNull(),
    expiraLa: timestamp("expira_la", { withTimezone: true }).notNull(),
    canvaTeamId: text("canva_team_id"),
    brandTemplateId: text("brand_template_id"),
    brandTemplateNume: text("brand_template_nume"),
    conectatDe: uuid("conectat_de").references(() => appUsers.id),
    conectatLa: timestamp("conectat_la", { withTimezone: true }).defaultNow().notNull(),
  },
).enableRLS();
