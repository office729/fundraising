import { boolean, index, integer, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { fundraisingDonations } from "./fundraising-pages";
import { organizations } from "./organizations";

// „Sursele donațiilor” (documentation/surse-donatii.sql): copia atribuirii făcută pe donație la început de plată; nu se mai modifică (aplicația are doar select și insert).
export const donatieSurse = pgTable(
  "donatie_surse",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    donationId: uuid("donation_id").notNull().references(() => fundraisingDonations.id, { onDelete: "cascade" }),
    captatLa: timestamp("captat_la", { withTimezone: true }).defaultNow().notNull(),
    persistent: boolean("persistent").notNull().default(false),
    regulaVersiune: text("reguli_versiune").notNull().default("v1"),

    pCategorie: text("p_categorie"),
    pUtmSource: text("p_utm_source"),
    pUtmMedium: text("p_utm_medium"),
    pCampanie: text("p_campanie"),
    pUtmContent: text("p_utm_content"),
    pUtmTerm: text("p_utm_term"),
    pClickIds: text("p_click_ids"),
    pReferrerHost: text("p_referrer_host"),
    pReferralId: text("p_referral_id"),
    pLa: timestamp("p_la", { withTimezone: true }),

    uCategorie: text("u_categorie").notNull(),
    uUtmSource: text("u_utm_source"),
    uUtmMedium: text("u_utm_medium"),
    uCampanie: text("u_campanie"),
    uUtmContent: text("u_utm_content"),
    uUtmTerm: text("u_utm_term"),
    uClickIds: text("u_click_ids"),
    uReferrerHost: text("u_referrer_host"),
    uReferralId: text("u_referral_id"),
    uLa: timestamp("u_la", { withTimezone: true }).notNull(),

    sumaOriginalaBani: integer("suma_originala_bani"),
    moneda: text("moneda"),
    sumaLei: integer("suma_lei"),
    cursEurRon: numeric("curs_eur_ron", { precision: 12, scale: 6 }),
    sumaEurCenti: integer("suma_eur_centi"),
    conversieBaza: text("conversie_baza").notNull().default("indisponibila"),
    cursLa: timestamp("curs_la", { withTimezone: true }),
  },
  (t) => [
    unique("donatie_surse_donation_id_key").on(t.donationId),
    index("donatie_surse_org_captat_idx").on(t.orgId, t.captatLa),
    index("donatie_surse_org_categorie_idx").on(t.orgId, t.uCategorie),
  ],
).enableRLS();
