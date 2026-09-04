import { boolean, index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { appUsers } from "./app-users";
import { organizations } from "./organizations";

// Un cont/beneficiar de Formular 230 al organizației — o organizație poate
// avea mai multe (ex. conturi diferite pe ani fiscali, sau pe proiecte), fiecare
// cu propriul link public (/f230/<orgSlug>/<slug>). Fiecare organizație are
// din start un beneficiar cu slug "principal" (creat la signup — vezi
// src/app/(auth)/signup/actions.ts), care păstrează funcțional link-ul vechi
// /f230/<orgSlug> (redirect către /f230/<orgSlug>/principal).
//
// shortCode — link scurt tip Bitly (/s/<cod>, generat automat la creare —
// vezi lib/short-code.ts), pentru distribuire publică fără orgSlug-ul lung
// în URL. Rezolvat public prin GET /s/[code] (redirect către link-ul real).
//
// IBAN/CIF/nume de-aici alimentează direct Secțiunea II a PDF-ului (datele
// beneficiarului) — deși acolo nu sunt câmpuri completabile în șablonul ANAF
// (verificat: cele 16 câmpuri completabile sunt toate din Secțiunea I, a
// contribuabilului), poziția exactă a textului static a fost măsurată pe
// șablon (pdfjs-dist) și e acoperită + redesenată dinamic la generare — vezi
// SECTIUNE_II în src/lib/formular230-pdf.ts. Un singur șablon PDF, comun
// tuturor conturilor — nu mai trebuie încărcat unul separat per cont.
export const formular230Beneficiari = pgTable(
  "formular230_beneficiari",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    nume: text("nume").notNull(),
    slug: text("slug").notNull(),
    // Nullable la nivel de schemă (rândurile vechi, dinainte de această
    // funcționalitate, nu au unul) — dar codul care creează un beneficiar nou
    // îl generează mereu; backfill pentru cele existente în
    // scripts/backfill-formular230-shortcode.mjs.
    shortCode: text("short_code").unique(),
    iban: text("iban"),
    cif: text("cif"),
    emailBeneficiar: text("email_beneficiar"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("formular230_beneficiari_org_slug_unique").on(t.orgId, t.slug)],
).enableRLS();

// Răspunsuri reale la Formularul 230 (redirecționare 3,5% din impozitul pe
// venit), completate de PUBLIC pe un link distribuit — NU e parte din
// prototipul „Calm Impact" pe localStorage: cine completează nu e autentificat
// și nu are acces la organizația din CRM, deci trebuie să ajungă undeva ce
// citim noi. Vezi src/app/api/[orgSlug]/formular230/[beneficiarSlug]/route.ts
// (POST public, GET doar pentru membri) și documentation/rls-setup.sql /
// scripts/restore-rls.mjs pentru politicile care fac asta posibil fără gaură
// de securitate.
export const formular230Submissions = pgTable(
  "formular230_submissions",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // Nullable — răspunsurile dinainte de acest beneficiar nu au unul asociat
    // (au fost trimise pe formularul unic, implicit, al organizației).
    beneficiarId: uuid("beneficiar_id").references(() => formular230Beneficiari.id, { onDelete: "set null" }),
    nume: text("nume").notNull(),
    prenume: text("prenume").notNull(),
    initialaTatalui: text("initiala_tatalui"),
    cnp: text("cnp").notNull(),
    email: text("email").notNull(),
    telefon: text("telefon"),
    strada: text("strada"),
    numar: text("numar"),
    judet: text("judet"),
    localitate: text("localitate"),
    codPostal: text("cod_postal"),
    bloc: text("bloc"),
    scara: text("scara"),
    etaj: text("etaj"),
    apartament: text("apartament"),
    distributie2Ani: boolean("distributie_2_ani").notNull().default(false),
    consimtamant: boolean("consimtamant").notNull().default(false),
    termeni: boolean("termeni").notNull().default(false),
    // Semnătură olografă, desenată pe canvas de semnatar — PNG codat base64
    // (data URI). E documentul juridic propriu-zis, nu doar o bifă.
    semnatura: text("semnatura").notNull(),
    // Anul fiscal pentru care s-a depus cererea — fixat la TRIMITERE, server-side
    // (vezi route.ts), NU recalculat la fiecare descărcare a PDF-ului. Înainte,
    // „Anul" de pe PDF era mereu anul curent — un formular din 2026 descărcat
    // în 2027 arăta greșit „2027". Nullable: rândurile de dinaintea acestui fix
    // nu au anul stocat — fallback la anul creării (vezi PdfButton).
    an: integer("an"),
    // Bifă manuală, pusă de echipă după ce a inclus fizic acest formular
    // într-un lot trimis/depus la ANAF — nu are efect automat, e doar
    // urmărire internă (vezi și exportul „borderou" din pagina de admin).
    procesatAnaf: boolean("procesat_anaf").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("formular230_org_idx").on(t.orgId),
    index("formular230_created_idx").on(t.createdAt),
    index("formular230_beneficiar_idx").on(t.beneficiarId),
  ],
).enableRLS();

// O trimitere a campaniei de reamintire prin email (către donatorii reali ai
// organizației, cu link-ul de Formular 230) — cel mult UNA per organizație
// per an fiscal, fie declanșată manual din panou, fie automat de cron-ul
// zilnic (vezi src/app/api/cron/formular230-reminder/route.ts), care verifică
// exact acest tabel ca să nu trimită de două ori în același an.
export const formular230CampaniiEmail = pgTable(
  "formular230_campanii_email",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    an: integer("an").notNull(),
    nrDestinatari: integer("nr_destinatari").notNull(),
    trimisDe: uuid("trimis_de").references(() => appUsers.id), // null dacă a trimis cron-ul automat
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("formular230_campanii_email_org_an_unique").on(t.orgId, t.an)],
).enableRLS();
