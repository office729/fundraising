import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { fundraisingDonationStatus, fundraisingPageStatus } from "./enums";
import { organizations } from "./organizations";

// Pagină de strângere fonduri creată de un SUSȚINĂTOR (public, neautentificat
// — vezi src/app/strangere-fonduri/[orgSlug]/creeaza), distribuită de acesta
// prin WhatsApp/email/social media. Fiecare organizație are propriul set de
// pagini; suma_stransa e un cache actualizat de webhook-ul Stripe la fiecare
// donație confirmată — nu se recalculează prin SUM() la fiecare afișare.
export const fundraisingPages = pgTable(
  "fundraising_pages",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    titlu: text("titlu").notNull(),
    poveste: text("poveste").notNull(),
    // Poză copertă — încărcată DOAR din CRM (organizația, autentificată), nu
    // din formularul public de creare a paginii; vezi
    // crm/strangere-fonduri/[id]/page.tsx. Stocată în bucket-ul Supabase
    // "org-branding" (deja public + upload permis pentru useri autentificați),
    // sub prefix "<orgSlug>/campanie-*" — nu mai trebuie un bucket separat.
    imagineUrl: text("imagine_url"),
    sumaTinta: integer("suma_tinta"), // lei; null = fără țintă afișată
    sumaStransa: integer("suma_stransa").notNull().default(0), // lei, cache
    numeCreator: text("nume_creator").notNull(),
    emailCreator: text("email_creator").notNull(),
    // Creatorul publică propriul nume + o poveste liberă — la fel ca la
    // donații, cere consimțământ explicit pentru procesarea acestor date.
    consimtamantGdpr: boolean("consimtamant_gdpr").notNull().default(false),
    status: fundraisingPageStatus("status").notNull().default("activa"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("fundraising_pages_org_slug_idx").on(t.orgId, t.slug),
    index("fundraising_pages_org_idx").on(t.orgId),
  ],
).enableRLS();

// O donație către o pagină — creată "in_asteptare" înainte de a trimite
// susținătorul spre Stripe Checkout, confirmată "reusita" doar de webhook-ul
// Stripe (checkout.session.completed), niciodată direct din browser.
export const fundraisingDonations = pgTable(
  "fundraising_donations",
  {
    id: uuid("id").primaryKey(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => fundraisingPages.id, { onDelete: "cascade" }),
    // Denormalizat intenționat — permite politici RLS simple (scoping direct
    // pe org_id) și interogări din CRM fără JOIN pe fundraising_pages.
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    numeDonator: text("nume_donator"),
    emailDonator: text("email_donator"),
    telefonDonator: text("telefon_donator"),
    suma: integer("suma").notNull(), // lei
    mesaj: text("mesaj"),
    // "anonim" ascunde doar AFIȘAREA publică a numelui (leaderboard/donații
    // recente) — numele/emailul/telefonul rămân în rând, pentru CRM-ul
    // organizației. Nu se confundă cu consimțământul GDPR de mai jos.
    anonim: boolean("anonim").notNull().default(false),
    consimtamantGdpr: boolean("consimtamant_gdpr").notNull().default(false),
    consimtamantTermeni: boolean("consimtamant_termeni").notNull().default(false),
    // Pentru prima plată a unui abonament (checkout mode="subscription"),
    // stripeSessionId e id-ul sesiunii Checkout — la fel ca o donație unică.
    // Pentru reînnoirile lunare ulterioare (webhook invoice.paid), nu mai
    // există o sesiune Checkout — stocăm id-ul facturii Stripe în același
    // câmp, prefixat, ca indexul unic să rămână valabil pentru ambele cazuri.
    stripeSessionId: text("stripe_session_id").notNull(),
    recurenta: boolean("recurenta").notNull().default(false),
    stripeSubscriptionId: text("stripe_subscription_id"),
    // Capturat de webhook la confirmare (checkout.session.completed/invoice.paid)
    // — singurul identificator stabil comun cu evenimentele charge.refunded/
    // charge.dispute.created, care nu poartă direct sesiunea Checkout sau
    // factura. Fără el, o rambursare nu s-ar putea corela înapoi la donație.
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    // Setat pe false de webhook la customer.subscription.deleted (pe TOATE
    // rândurile cu același stripeSubscriptionId) — singurul semnal din date
    // că un donator lunar s-a oprit; irelevant (rămâne true) pentru donațiile
    // unice.
    abonamentActiv: boolean("abonament_activ").notNull().default(true),
    status: fundraisingDonationStatus("status").notNull().default("in_asteptare"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("fundraising_donations_page_idx").on(t.pageId),
    index("fundraising_donations_org_idx").on(t.orgId),
    uniqueIndex("fundraising_donations_stripe_session_idx").on(t.stripeSessionId),
    index("fundraising_donations_payment_intent_idx").on(t.stripePaymentIntentId),
  ],
).enableRLS();

// Actualizări postate de organizație pe o pagină de campanie (ex. „Am ajuns
// la 50% din țintă", cu mulțumiri) — arătate public, în ordine cronologică
// inversă, pe pagina campaniei. Poza (opțională) vine într-o etapă viitoare,
// odată configurat Supabase Storage — coloana nu există încă, se adaugă
// atunci fără migrare separată de conținut.
export const fundraisingUpdates = pgTable(
  "fundraising_updates",
  {
    id: uuid("id").primaryKey(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => fundraisingPages.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    titlu: text("titlu").notNull(),
    continut: text("continut").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("fundraising_updates_page_idx").on(t.pageId),
    index("fundraising_updates_org_idx").on(t.orgId),
  ],
).enableRLS();

// Donatori REALI (spre deosebire de modulul CRM „Calm Impact", care e
// prototip cu date demo în localStorage) — un rând per persoană care a
// donat efectiv prin Stripe, cu upsert (după org_id+email) la fiecare
// donație confirmată. Singura sursă azi e Strângere fonduri (peer-to-peer);
// `sursa`/`metodaPlata` sunt text liber ca să încapă și surse viitoare, fără
// migrare de schemă. Scris DOAR de webhook-ul Stripe.
export const donatoriReali = pgTable(
  "donatori_reali",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    nume: text("nume").notNull(),
    email: text("email").notNull(),
    telefon: text("telefon"),
    sursa: text("sursa").notNull(),
    metodaPlata: text("metoda_plata").notNull().default("Card (Stripe)"),
    totalDonat: integer("total_donat").notNull().default(0), // lei, cache
    numarDonatii: integer("numar_donatii").notNull().default(0),
    primaDonatieLa: timestamp("prima_donatie_la", { withTimezone: true }).defaultNow().notNull(),
    ultimaDonatieLa: timestamp("ultima_donatie_la", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("donatori_reali_org_email_idx").on(t.orgId, t.email),
    index("donatori_reali_org_idx").on(t.orgId),
  ],
).enableRLS();
