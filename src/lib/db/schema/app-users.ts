import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { accountType } from "./enums";

// Persoana autentificată prin Supabase Auth (o replică minimă, legată prin
// e-mail — vezi pattern-ul din SOI_CRM `verifySession()`). NU conține rol
// global: rolul e per-organizație, în tabelul `memberships`. Numit
// `app_users` (nu `users`) ca să nu se confunde cu `auth.users` din Supabase.
export const appUsers = pgTable("app_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  // Determinat de felul invitației acceptate (organizație vs. beneficiar),
  // NU ales liber de utilizator — vezi src/lib/db/schema/beneficiar.ts.
  // Nullable: un app_user proaspăt creat (înainte de acceptarea vreunei
  // invitații) încă nu are tip stabilit.
  accountType: accountType("account_type"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  // Setat la fiecare autentificare reușită (login/actions.ts) — singura sursă
  // de "ultima autentificare" din platformă; `auth.users.last_sign_in_at` al
  // Supabase nu e accesibil rolului `app_user` (schema `auth` e restricționată),
  // de-aici nevoia unei coloane proprii. Null = niciodată autentificat (ex.
  // un angajat creat administrativ, fără cont propriu încă).
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  // Dovada acceptării Termenilor și a Politicii de confidențialitate (GDPR art.
  // 7(1) / contract): momentul bifei și versiunea textelor legale acceptate
  // (lib/legal-version.ts). Null = cont creat înainte de bifa de acceptare.
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
  termsVersion: text("terms_version"),
}).enableRLS();
