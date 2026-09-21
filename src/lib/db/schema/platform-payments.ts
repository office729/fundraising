import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { orgPackage } from "./enums";
import { organizations } from "./organizations";

export const platformPaymentStatus = pgEnum("platform_payment_status", ["in_asteptare", "reusita", "esuata", "anulata", "rambursata"]);

// Plățile abonamentului PLATFORMEI (49 / 149 / 299 lei/lună etc.), încasate
// prin Netopia — nu sunt donații (acelea stau în fundraising_donations și merg
// în contul Stripe al ONG-ului). O comandă = o lună de acces plătită; accesul
// se prelungește doar când IPN-ul verificat al Netopia o confirmă ca reușită.
export const platformPayments = pgTable(
  "platform_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // ID-ul comenzii trimis la Netopia (`order.orderID`) — cheia de corelare a
    // IPN-ului; unic, ca o confirmare retrimisă să nu prelungească accesul de două ori.
    orderId: text("order_id").notNull().unique(),
    ntpId: text("ntp_id"),
    package: orgPackage("package").notNull(),
    // Suma întreagă în lei, calculată server-side (cu reducerea de recomandare
    // aplicată, dacă e cazul) — IPN-ul e acceptat doar dacă suma plătită coincide.
    sumaLei: integer("suma_lei").notNull(),
    luni: integer("luni").notNull().default(1),
    // Configurația planului à la carte (doar pentru package = "custom"), înghețată
    // la momentul comenzii: se aplică organizației abia când plata e confirmată,
    // ca o plată abandonată să nu-i schimbe pachetul în timp ce accesul curent
    // rămâne plătit.
    planConfig: jsonb("plan_config"),
    status: platformPaymentStatus("status").notNull().default("in_asteptare"),
    netopiaStatus: integer("netopia_status"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [index("platform_payments_org_idx").on(t.orgId)],
).enableRLS();
