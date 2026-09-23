import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { orgDomeniuActivitate, orgPackage, subscriptionStatus } from "./enums";

// O organizație = un ONG client. Fiecare tabel de date de tenant (companii,
// donatori etc.) are un FK org_id către acest tabel, izolat prin RLS
// (vezi documentation/rls-setup.sql) — Alexandrit NU citește
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
  // CIF-ul organizației și domeniul ei de activitate — opționale, completate
  // din Setări/onboarding (nu blochează nimic la lipsă). Domeniul filtrează
  // ce design-uri de campanie vede org-ul implicit (vezi
  // src/lib/campaign-templates.ts); CIF-ul e validat doar ca FORMAT (nu
  // checksum complet), cu cifValidFormat() din lib/iban.ts.
  cif: text("cif"),
  domeniuActivitate: orgDomeniuActivitate("domeniu_activitate"),
  package: orgPackage("package").notNull().default("trial"),
  // Configurația planului à la carte, salvată doar când package = "custom"
  // — { utilizatori, contactePf, companiiPj, generariLunare, tools, pretLunar }.
  // pretLunar e recalculat și suprascris server-side la fiecare salvare
  // (vezi lib/billing/custom-plan.ts) — nu se are încredere în prețul trimis
  // de client.
  customPlanConfig: jsonb("custom_plan_config"),
  subscriptionStatus: subscriptionStatus("subscription_status").notNull().default("trialing"),
  // Vechi — abonamentele PLATFORMEI se încasează acum prin Netopia (vezi
  // platform_payments); coloanele rămân doar pentru rândurile mai vechi.
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  // Contul Stripe PROPRIU al ONG-ului, pentru donațiile primite pe paginile lui
  // de campanie — platforma nu are cont Stripe. Cheia secretă și secretul
  // webhook-ului sunt criptate (AES-256-GCM, cheia ORG_SECRETS_KEY din mediu) și
  // nu se trimit niciodată către client; `donationStripeKeyHint` = ultimele 4
  // caractere, doar pentru afișare în Setări.
  donationStripeSecretEnc: text("donation_stripe_secret_enc"),
  donationStripeWebhookSecretEnc: text("donation_stripe_webhook_secret_enc"),
  donationStripeKeyHint: text("donation_stripe_key_hint"),
  donationStripeConnectedAt: timestamp("donation_stripe_connected_at", { withTimezone: true }),
  // Cheia PUBLICABILĂ (pk_live_/pk_test_) a contului Stripe al ONG-ului —
  // spre deosebire de cheia secretă de mai sus, aceasta e menită să ajungă în
  // browser (loadStripe pe pagina publică de donații, pentru butoanele
  // Apple Pay/Google Pay/PayPal), deci NU se criptează.
  donationStripePublishableKey: text("donation_stripe_publishable_key"),
  // Ultima înregistrare reușită a domeniilor platformei (alexandrit.ro +
  // domeniul propriu, dacă are) ca "payment method domain" verificat pe
  // CONTUL Stripe al acestui ONG (stripe.paymentMethodDomains.create) — doar
  // pentru un status afișat în Setări; nu e necesară funcțional, Stripe pur
  // și simplu nu arată butoanele Apple Pay/Google Pay dacă domeniul nu e
  // verificat, fără nicio eroare.
  donationStripeDomainVerifiedAt: timestamp("donation_stripe_domain_verified_at", { withTimezone: true }),
  // Referral: codul PROPRIU al organizației (generat leneș, la prima cerere —
  // vezi lib/referral.ts — nu la creare, ca să nu complice bootstrap-ul RLS
  // din signup) — orice organizație îl poate distribui ca
  // `/signup?ref=<cod>`. `referredByOrgId` se completează o singură dată, la
  // înscriere, dacă cine s-a înscris a folosit un cod valid — vezi
  // signup/actions.ts și (marketing)/finalize-actions.ts. Reducerea de 50%
  // la primul abonament (lib/billing/stripe-checkout.ts) se aplică doar dacă
  // acest câmp e completat ȘI stripeSubscriptionId e încă null.
  referralCode: text("referral_code").unique(),
  referredByOrgId: uuid("referred_by_org_id").references((): AnyPgColumn => organizations.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();
