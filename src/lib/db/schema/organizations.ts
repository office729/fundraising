import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { orgPackage, subscriptionStatus } from "./enums";

// O organizație = un ONG client. Fiecare tabel de date de tenant (companii,
// donatori etc.) are un FK org_id către acest tabel, izolat prin RLS
// (vezi documentation/rls-setup.sql) — Fundraising Academy NU citește
// direct aceste date în producție.
export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  // Identitate vizuală — logo-ul e sursa: culoarea se extrage automat din el
  // la upload (medie de pixeli, client-side), dar rămâne editabilă manual.
  logoUrl: text("logo_url"),
  slogan: text("slogan"),
  brandColor: text("brand_color"),
  // Domeniu propriu (ex. "susinima.ro"), opțional — DNS-ul lor trebuie să
  // aibă un CNAME către cname.vercel-dns.com; activarea efectivă pe Vercel
  // (vercel domains add) e un pas separat, asistat. Vezi src/proxy.ts —
  // rescrie orice cerere pe acest host către /<slug>/... intern.
  customDomain: text("custom_domain").unique(),
  package: orgPackage("package").notNull().default("trial"),
  subscriptionStatus: subscriptionStatus("subscription_status").notNull().default("trialing"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();
