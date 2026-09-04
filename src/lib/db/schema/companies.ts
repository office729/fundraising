import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { appUsers } from "./app-users";
import { companyContractStatus, companyStage, companyStatus, companyTemperatura, regimFiscal } from "./enums";
import { organizations } from "./organizations";

// Entitatea centrală CRM PJ: firma prospect / sponsor (portat din SOI_CRM,
// + org_id pentru izolare de tenant).
export const companies = pgTable(
  "companies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // Identitate
    nume: text("nume").notNull(),
    cui: text("cui"),
    nrRegCom: text("nr_reg_com"),
    judet: text("judet"),
    localitate: text("localitate"),
    adresa: text("adresa"),
    codPostal: text("cod_postal"),
    caen: text("caen"),
    industrie: text("industrie"),
    anInfiintare: integer("an_infiintare"),
    site: text("site"),
    linkedin: text("linkedin"),
    facebook: text("facebook"),
    administrator: text("administrator"),
    // Financiar
    ca: bigint("ca", { mode: "number" }),
    profit: bigint("profit", { mode: "number" }),
    profitTip: text("profit_tip"),
    impozit: bigint("impozit", { mode: "number" }),
    nrAngajati: integer("nr_angajati"),
    sursaFin: text("sursa_fin"),
    anBilant: integer("an_bilant"),
    regimFiscal: regimFiscal("regim_fiscal").notNull().default("necunoscut"),
    // Fundraising
    sumaDisponibila: bigint("suma_disponibila", { mode: "number" }),
    sumaEstimata: boolean("suma_estimata").notNull().default(false),
    sumaPropusa: bigint("suma_propusa", { mode: "number" }),
    sumaSponsorizata: bigint("suma_sponsorizata", { mode: "number" }),
    recurent: boolean("recurent").notNull().default(false),
    frecventa: text("frecventa"),
    campanie230: boolean("campanie_230").notNull().default(false),
    // Marcaje "Cum sponsorizează" — vezi modulul CRM Companii
    // (src/app/(app)/[orgSlug]/crm/companii). temperatura null = niciuna
    // dintre cald/rece bifată încă.
    temperatura: companyTemperatura("temperatura"),
    d177: boolean("d177").notNull().default(false),
    // Bifată manual de echipă după ce banii redirecționați prin D177 chiar
    // au intrat în cont — distinctă de `d177` (care doar marchează firma ca
    // sponsorizând prin acest mecanism, indiferent dacă s-a încasat deja).
    d177Incasat: boolean("d177_incasat").notNull().default(false),
    mec20: boolean("mec20").notNull().default(false), // "20% (caz)" — sponsorizare deductibilă
    decembrie: boolean("decembrie").notNull().default(false),
    // Contract — minimal, fără fișier atașat (necesită Supabase Storage,
    // deferred — vezi scripts/setup-storage.mjs). Doar starea + referința.
    numarContract: text("numar_contract"),
    dataSemnare: date("data_semnare"),
    contractStatus: companyContractStatus("contract_status"),
    // Pipeline
    stage: companyStage("stage").notNull().default("nou"),
    status: companyStatus("status").notNull().default("open"),
    lostReason: text("lost_reason"),
    probability: integer("probability"),
    ownerId: uuid("owner_id").references(() => appUsers.id),
    followupAt: timestamp("followup_at", { withTimezone: true }),
    closeTarget: date("close_target"),
    // Informativ (JSONB) — se afișează, nu se interoghează
    media: jsonb("media"),
    trimestre: jsonb("trimestre"),
    istoric: jsonb("istoric"),
    ong: jsonb("ong"),
    // Câmpuri de lucru ne-mapate în coloane (compatibilitate cu tool-ul UI)
    extra: jsonb("extra"),
    abordarePrin: text("abordare_prin"),
    stilAbordare: text("stil_abordare"),
    nota: text("nota"),
    // Meta
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
    updatedBy: uuid("updated_by").references(() => appUsers.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    // Bifat la fiecare deschidere a fișei firmei (companii/[id]/page.tsx) —
    // distinct de updatedAt (editare de date), arată doar când a intrat
    // cineva ultima oară pe pagina ei.
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
  },
  (t) => [
    index("companies_org_idx").on(t.orgId),
    index("companies_judet_idx").on(t.judet),
    index("companies_status_idx").on(t.status),
    index("companies_stage_idx").on(t.stage),
    index("companies_owner_idx").on(t.ownerId),
    index("companies_cui_idx").on(t.cui),
  ],
).enableRLS();
